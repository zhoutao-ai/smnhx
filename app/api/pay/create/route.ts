/**
 * POST /api/pay/create
 *
 * 创建支付宝电脑网站支付订单，返回支付跳转 URL。
 * 真实支付时调用支付宝 API；Mock 模式直接返回模拟数据。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPagePay, generateOutTradeNo } from '@/lib/alipay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const outTradeNo = generateOutTradeNo();
  const isMock = process.env.MOCK_PAY === 'true';
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zwdssm.top';

  if (isMock) {
    return NextResponse.json({
      success: true,
      payUrl: `${origin}/pay?mock=paid&outTradeNo=${outTradeNo}`,
      outTradeNo,
      mock: true,
    });
  }

  // ─── 真实支付：电脑网站支付 ───
  const returnUrl = `${origin}/pay?outTradeNo=${outTradeNo}`;
  const result = await createPagePay(outTradeNo, '2.00', '紫微AI解读·永久解锁', returnUrl);

  if (result.success) {
    return NextResponse.json({
      success: true,
      payUrl: result.payUrl,
      payForm: (result as any).payForm,
      outTradeNo: result.outTradeNo ?? outTradeNo,
    });
  }

  return NextResponse.json(
    { success: false, error: result.error ?? '创建订单失败' },
    { status: 500 },
  );
}
