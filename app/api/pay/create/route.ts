/**
 * POST /api/pay/create
 *
 * 创建支付宝电脑网站支付订单，返回签名后的 HTML 表单。
 * 前端渲染表单后自动提交，跳转支付宝收银台。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPagePay, generateOutTradeNo, isMockPay } from '@/lib/alipay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const outTradeNo = generateOutTradeNo();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zwdssm.top';

  // Mock 模式
  if (isMockPay()) {
    return NextResponse.json({
      success: true,
      mock: true,
      outTradeNo,
      payUrl: `${baseUrl}/pay?mock=paid&outTradeNo=${outTradeNo}`,
    });
  }

  // 真实支付
  const returnUrl = `${baseUrl}/pay?outTradeNo=${outTradeNo}`;
  const notifyUrl = `${baseUrl}/api/pay/notify`;

  const result = createPagePay(outTradeNo, '2.00', '紫微AI解读·永久解锁', returnUrl, notifyUrl);

  if (result.success) {
    return NextResponse.json({
      success: true,
      payForm: result.payForm,
      outTradeNo: result.outTradeNo,
    });
  }

  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}
