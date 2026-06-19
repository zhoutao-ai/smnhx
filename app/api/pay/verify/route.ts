import { NextRequest, NextResponse } from 'next/server';
import { queryAlipayTrade } from '@/lib/payment/alipay';
import { isMockPay } from '@/lib/payment/config';
import { getPaymentOrder, markPaymentPaid } from '@/lib/payment/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const outTradeNo = typeof body.outTradeNo === 'string' ? body.outTradeNo.trim() : '';

  if (!outTradeNo) {
    return NextResponse.json({ success: false, paid: false, error: '缺少订单号' }, { status: 400 });
  }

  try {
    const order = await getPaymentOrder(outTradeNo);
    if (!order) {
      return NextResponse.json({ success: false, paid: false, error: '订单不存在' }, { status: 404 });
    }

    if (order.status === 'paid') {
      return NextResponse.json({
        success: true,
        paid: true,
        status: order.status,
        outTradeNo,
        tradeNo: order.trade_no,
      });
    }

    if (isMockPay()) {
      return NextResponse.json({ success: true, paid: false, mock: true, status: order.status, outTradeNo });
    }

    const result = await queryAlipayTrade(outTradeNo);
    if (!result.ok) {
      return NextResponse.json({ success: false, paid: false, error: result.error }, { status: 502 });
    }

    if (result.paid) {
      await markPaymentPaid({
        outTradeNo,
        tradeNo: result.tradeNo,
        totalAmount: result.totalAmount,
        buyerId: result.buyerId,
        buyerLogonId: result.buyerLogonId,
      });
    }

    return NextResponse.json({
      success: true,
      paid: result.paid,
      status: result.paid ? 'paid' : order.status,
      tradeStatus: result.tradeStatus,
      outTradeNo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询支付状态失败';
    return NextResponse.json({ success: false, paid: false, error: message }, { status: 500 });
  }
}
