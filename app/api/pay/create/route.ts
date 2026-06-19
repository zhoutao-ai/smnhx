import { NextResponse } from 'next/server';
import { createAlipayPagePay } from '@/lib/payment/alipay';
import { getPaymentProduct, getSiteUrl, isMockPay, isPayEnabled } from '@/lib/payment/config';
import { createPaymentOrder, generateOutTradeNo, markPaymentPaid } from '@/lib/payment/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  if (!isPayEnabled()) {
    return NextResponse.json({ success: false, error: '支付功能暂未开放' }, { status: 403 });
  }

  const product = getPaymentProduct();
  const outTradeNo = generateOutTradeNo();

  try {
    await createPaymentOrder(outTradeNo, product);

    if (isMockPay()) {
      await markPaymentPaid({
        outTradeNo,
        tradeNo: `MOCK_${outTradeNo}`,
        totalAmount: product.amount,
      });

      return NextResponse.json({
        success: true,
        mock: true,
        outTradeNo,
        amount: product.amount,
        subject: product.subject,
        payUrl: `${getSiteUrl()}/pay?outTradeNo=${encodeURIComponent(outTradeNo)}`,
      });
    }

    const result = createAlipayPagePay(outTradeNo);
    if (!result.ok || !result.payForm) {
      return NextResponse.json({ success: false, error: result.error ?? '创建支付订单失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      outTradeNo,
      amount: product.amount,
      subject: product.subject,
      payForm: result.payForm,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建支付订单失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
