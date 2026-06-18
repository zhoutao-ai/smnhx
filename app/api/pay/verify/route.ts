/**
 * POST /api/pay/verify
 *
 * 查询订单支付状态。前端轮询 / 手动点击验证。
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryPay, isMockPay } from '@/lib/alipay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const outTradeNo: string = body.outTradeNo ?? '';

  // Mock
  if (isMockPay()) {
    return NextResponse.json({
      success: true,
      paid: body.manual === true,
      mock: true,
    });
  }

  if (!outTradeNo) {
    return NextResponse.json({ success: false, paid: false, error: '缺少订单号' }, { status: 400 });
  }

  const result = await queryPay(outTradeNo);

  if (result.success) {
    return NextResponse.json({
      success: true,
      paid: result.paid,
      tradeStatus: result.tradeStatus,
    });
  }

  return NextResponse.json({ success: false, paid: false, error: result.error }, { status: 500 });
}
