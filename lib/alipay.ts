/**
 * 支付宝电脑网站支付
 *
 * alipay.trade.page.pay — 跳转收银台，用户支付后异步通知验签。
 *
 * 官方文档：https://opendocs.alipay.com/open/270/105899
 */

import { AlipaySdk } from 'alipay-sdk';

// ─── 配置 ───────────────────────────────────────────────────

function getClient(): AlipaySdk | null {
  const appId = process.env.ALIPAY_APP_ID;
  const privateKey = process.env.ALIPAY_PRIVATE_KEY;
  const publicKey = process.env.ALIPAY_PUBLIC_KEY;

  if (!appId || !privateKey || !publicKey) return null;

  const isSandbox = process.env.ALIPAY_SANDBOX === 'true';

  return new AlipaySdk({
    appId,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    alipayPublicKey: publicKey.replace(/\\n/g, '\n'),
    signType: 'RSA2',
    keyType: (process.env.ALIPAY_KEY_TYPE as 'PKCS1' | 'PKCS8') || 'PKCS1',
    gateway: isSandbox
      ? 'https://openapi.alipaydev.com/gateway.do'
      : 'https://openapi.alipay.com/gateway.do',
    timeout: 30000,
    charset: 'utf-8',
    version: '1.0',
  });
}

// ─── 工具 ───────────────────────────────────────────────────

export function generateOutTradeNo(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `ZIWEI_${ts}_${rand}`;
}

export function isMockPay(): boolean {
  return process.env.MOCK_PAY === 'true';
}

// ─── 创建支付 ───────────────────────────────────────────────

export interface CreatePayResult {
  success: boolean;
  payUrl?: string;    // 支付宝收银台跳转 URL
  outTradeNo?: string;
  error?: string;
}

/**
 * 生成电脑网站支付跳转 URL。
 * 前端直接 window.location.href 跳转支付宝收银台。
 */
export function createPagePay(
  outTradeNo: string,
  totalAmount: string,
  subject: string,
  returnUrl: string,
  notifyUrl: string,
): CreatePayResult {
  const client = getClient();
  if (!client) {
    return { success: false, error: '支付宝未配置' };
  }

  try {
    // pageExec 生成 POST 表单, 提取 action URL + 补上 biz_content 参数实现 GET 跳转
    const formHtml = client.pageExec('alipay.trade.page.pay', {
      bizContent: {
        out_trade_no: outTradeNo,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: totalAmount,
        subject,
      },
      returnUrl,
      notifyUrl,
    });

    // 从 form action 提取已签名的基础 URL
    const match = formHtml.match(/action="([^"]+)"/);
    const actionUrl = match ? match[1] : '';

    if (!actionUrl) {
      return { success: false, error: '生成支付链接失败' };
    }

    // 把 biz_content 也加到 URL 参数里（支付宝网关兼容 GET 请求）
    const bizContent = JSON.stringify({
      out_trade_no: outTradeNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      total_amount: totalAmount,
      subject,
    });
    const payUrl = `${actionUrl}&biz_content=${encodeURIComponent(bizContent)}`;

    return { success: true, payUrl, outTradeNo };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '支付宝请求异常';
    return { success: false, error: msg };
  }
}

// ─── 查询支付 ───────────────────────────────────────────────

export interface QueryPayResult {
  success: boolean;
  paid: boolean;
  tradeStatus?: string;
  error?: string;
}

/**
 * 查询订单支付状态。
 * alipay.trade.query
 */
export async function queryPay(outTradeNo: string): Promise<QueryPayResult> {
  const client = getClient();
  if (!client) return { success: false, paid: false, error: '支付宝未配置' };

  try {
    const result = await client.exec('alipay.trade.query', {
      bizContent: { out_trade_no: outTradeNo },
    });

    if (result.code === '10000') {
      const status = result.trade_status as string;
      return {
        success: true,
        paid: status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED',
        tradeStatus: status,
      };
    }

    return {
      success: false,
      paid: false,
      error: `${result.sub_msg ?? result.msg} (${result.sub_code ?? result.code})`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '查询异常';
    return { success: false, paid: false, error: msg };
  }
}

// ─── 验签（异步通知） ──────────────────────────────────────

/**
 * 验证支付宝异步通知签名。
 * 返回验证通过的参数，或 null（验签失败）。
 */
export function verifyNotifySign(params: Record<string, string>): Record<string, string> | null {
  const client = getClient();
  if (!client) return null;

  try {
    const sign = params.sign;
    if (!sign) return null;

    const valid = (client as any).checkNotifySign(sign, params as any);
    return valid ? params : null;
  } catch {
    return null;
  }
}
