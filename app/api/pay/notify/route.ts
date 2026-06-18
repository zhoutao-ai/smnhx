/**
 * POST /api/pay/notify
 *
 * 支付宝异步通知接收端点。
 * 支付宝支付完成后，服务端 POST 到此 URL 通知支付结果。
 * 这是唯一可信的支付确认方式（用户可能关闭浏览器不触发同步回调）。
 *
 * 参考：https://opendocs.alipay.com/open/270/105902
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/index';
import { verifyNotifySign, isMockPay } from '@/lib/alipay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Mock 模式：不处理
  if (isMockPay()) {
    return new Response('success');
  }

  try {
    // 支付宝 POST 的是 application/x-www-form-urlencoded
    const body = await request.formData();
    const params: Record<string, string> = {};
    body.forEach((v, k) => { params[k] = v.toString(); });

    // 验签
    const verified = verifyNotifySign(params);
    if (!verified) {
      console.error('[pay:notify] 验签失败');
      return new Response('fail');
    }

    // 检查交易状态
    const tradeStatus = verified.trade_status;
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      console.log('[pay:notify] 交易未完成:', tradeStatus);
      return new Response('success'); // 不重试，等下次通知
    }

    const outTradeNo = verified.out_trade_no;
    const tradeNo = verified.trade_no;
    const totalAmount = verified.total_amount;

    // 记录支付信息
    await sql`
      INSERT INTO payments (out_trade_no, trade_no, total_amount, status, created_at)
      VALUES (${outTradeNo}, ${tradeNo}, ${totalAmount}, 'paid', NOW())
      ON CONFLICT (out_trade_no) DO UPDATE SET status = 'paid', trade_no = ${tradeNo}
    `.catch(e => console.error('[pay:notify] DB写入失败:', e));

    console.log(`[pay:notify] ✅ 到账: ${outTradeNo} ${totalAmount}元`);
    return new Response('success');
  } catch (e) {
    console.error('[pay:notify] 异常:', e);
    return new Response('fail');
  }
}
