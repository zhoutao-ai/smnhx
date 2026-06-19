import { NextRequest } from 'next/server';
import { verifyAlipayNotify } from '@/lib/payment/alipay';
import { getPaymentProduct, isMockPay } from '@/lib/payment/config';
import { getPaymentOrder, isPaidStatus, markPaymentFailed, markPaymentPaid } from '@/lib/payment/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (isMockPay()) return new Response('success');

  try {
    const form = await request.formData();
    const params: Record<string, string> = {};
    form.forEach((value, key) => {
      params[key] = String(value);
    });

    if (!verifyAlipayNotify(params)) {
      console.error('[pay:notify] invalid alipay signature');
      return new Response('fail');
    }

    const outTradeNo = params.out_trade_no;
    if (!outTradeNo) return new Response('fail');

    const order = await getPaymentOrder(outTradeNo);
    if (!order) {
      console.error('[pay:notify] unknown order', outTradeNo);
      return new Response('fail');
    }

    const product = getPaymentProduct();
    if (params.total_amount && Number(params.total_amount) !== Number(product.amount)) {
      console.error('[pay:notify] amount mismatch', outTradeNo, params.total_amount);
      await markPaymentFailed(outTradeNo);
      return new Response('fail');
    }

    if (!isPaidStatus(params.trade_status)) {
      return new Response('success');
    }

    await markPaymentPaid({
      outTradeNo,
      tradeNo: params.trade_no,
      totalAmount: params.total_amount,
      buyerId: params.buyer_id,
      buyerLogonId: params.buyer_logon_id,
      rawNotify: params,
    });

    console.log('[pay:notify] paid', outTradeNo);
    return new Response('success');
  } catch (error) {
    console.error('[pay:notify] failed', error);
    return new Response('fail');
  }
}
