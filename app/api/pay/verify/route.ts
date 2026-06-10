/**
 * POST /api/pay/verify
 *
 * 查询支付宝订单支付状态。
 * Body: { outTradeNo: string, manual?: boolean }
 *
 * Mock 模式：仅手动确认（manual=true）时返回已支付，轮询返回未支付。
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOrder } from '@/lib/alipay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const isMock = process.env.MOCK_PAY === 'true';

  if (isMock) {
    const body: { manual?: boolean } = await request.json().catch(() => ({}));
    // 仅手动点击"已完成支付"时返回 true，模拟真实支付确认
    if (body.manual) {
      return NextResponse.json({ success: true, paid: true, mock: true });
    }
    // 轮询：返回未支付（用户必须手动确认）
    return NextResponse.json({ success: true, paid: false, mock: true });
  }

  try {
    const body: { outTradeNo?: string; manual?: boolean } = await request.json().catch(() => ({}));
    const outTradeNo = body.outTradeNo;

    if (!outTradeNo) {
      return NextResponse.json(
        { success: false, paid: false, error: '缺少订单号' },
        { status: 400 },
      );
    }

    const result = await queryOrder(outTradeNo);

    if (result.success) {
      return NextResponse.json({
        success: true,
        paid: result.paid,
        tradeStatus: result.tradeStatus,
      });
    }

    return NextResponse.json(
      { success: false, paid: false, error: result.error },
      { status: 500 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : '查询异常';
    return NextResponse.json(
      { success: false, paid: false, error: msg },
      { status: 500 },
    );
  }
}
