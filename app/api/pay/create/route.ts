/**
 * POST /api/pay/create
 *
 * 创建支付宝当面付订单，返回 QR 码链接。
 * 真实支付时调用支付宝 API；Mock 模式直接返回模拟数据。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPrecreate, generateOutTradeNo } from '@/lib/alipay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  const outTradeNo = generateOutTradeNo();
  const isMock = process.env.MOCK_PAY === 'true';

  if (isMock) {
    // Mock 模式：直接返回模拟 QR 码
    const mockQrUrl = process.env.NEXT_PUBLIC_ALIPAY_URL ?? 'https://qr.alipay.com/mock';
    return NextResponse.json({
      success: true,
      qrCode: mockQrUrl,
      outTradeNo,
      mock: true,
    });
  }

  // ─── 真实支付：调用支付宝当面付预下单 ───
  const result = await createPrecreate(outTradeNo, '2.00', '紫微AI解读·永久解锁');

  if (result.success) {
    return NextResponse.json({
      success: true,
      qrCode: result.qrCode,
      outTradeNo: result.outTradeNo ?? outTradeNo,
    });
  }

  return NextResponse.json(
    { success: false, error: result.error ?? '创建订单失败' },
    { status: 500 },
  );
}
