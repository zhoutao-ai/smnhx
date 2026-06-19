import { AlipaySdk } from 'alipay-sdk';
import { getAlipayConfig, getPaymentProduct, getSiteUrl } from './config';
import { isPaidStatus } from './orders';

let client: AlipaySdk | null | undefined;

function getClient(): AlipaySdk | null {
  if (client !== undefined) return client;

  const config = getAlipayConfig();
  if (!config) {
    client = null;
    return client;
  }

  client = new AlipaySdk({
    appId: config.appId,
    privateKey: config.privateKey,
    alipayPublicKey: config.alipayPublicKey,
    signType: 'RSA2',
    keyType: config.keyType,
    gateway: config.sandbox
      ? 'https://openapi.alipaydev.com/gateway.do'
      : 'https://openapi.alipay.com/gateway.do',
    timeout: 30000,
    charset: 'utf-8',
    version: '1.0',
  });

  return client;
}

export interface CreateAlipayPagePayResult {
  ok: boolean;
  payForm?: string;
  error?: string;
}

export function createAlipayPagePay(outTradeNo: string): CreateAlipayPagePayResult {
  const alipay = getClient();
  if (!alipay) return { ok: false, error: '支付宝未配置' };

  const siteUrl = getSiteUrl();
  const product = getPaymentProduct();

  try {
    const payForm = alipay.pageExecute('alipay.trade.page.pay', 'POST', {
      bizContent: {
        out_trade_no: outTradeNo,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: product.amount,
        subject: product.subject,
      },
      returnUrl: `${siteUrl}/pay?outTradeNo=${encodeURIComponent(outTradeNo)}`,
      notifyUrl: `${siteUrl}/api/pay/notify`,
    });

    return { ok: true, payForm };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '创建支付宝订单失败' };
  }
}

export interface QueryAlipayTradeResult {
  ok: boolean;
  paid: boolean;
  tradeStatus?: string;
  tradeNo?: string;
  totalAmount?: string;
  buyerId?: string;
  buyerLogonId?: string;
  error?: string;
}

export async function queryAlipayTrade(outTradeNo: string): Promise<QueryAlipayTradeResult> {
  const alipay = getClient();
  if (!alipay) return { ok: false, paid: false, error: '支付宝未配置' };

  try {
    const response = await alipay.exec('alipay.trade.query', {
      bizContent: { out_trade_no: outTradeNo },
    });
    const data = response as Record<string, unknown>;
    const code = String(data.code ?? '');

    if (code !== '10000') {
      const message = String(data.subMsg ?? data.sub_msg ?? data.msg ?? '支付宝查询失败');
      const subCode = String(data.subCode ?? data.sub_code ?? code);
      return { ok: false, paid: false, error: `${message} (${subCode})` };
    }

    const tradeStatus = String(data.tradeStatus ?? data.trade_status ?? '');
    return {
      ok: true,
      paid: isPaidStatus(tradeStatus),
      tradeStatus,
      tradeNo: stringOrUndefined(data.tradeNo ?? data.trade_no),
      totalAmount: stringOrUndefined(data.totalAmount ?? data.total_amount),
      buyerId: stringOrUndefined(data.buyerUserId ?? data.buyer_user_id),
      buyerLogonId: stringOrUndefined(data.buyerLogonId ?? data.buyer_logon_id),
    };
  } catch (error) {
    return { ok: false, paid: false, error: error instanceof Error ? error.message : '支付宝查询异常' };
  }
}

export function verifyAlipayNotify(params: Record<string, string>): boolean {
  const alipay = getClient();
  if (!alipay || !params.sign) return false;

  const sdk = alipay as AlipaySdk & {
    checkNotifySignV2?: (postData: Record<string, string>) => boolean;
    checkNotifySign?: (postData: Record<string, string>, raw?: boolean) => boolean;
  };

  try {
    if (sdk.checkNotifySignV2?.(params)) return true;
    return sdk.checkNotifySign?.(params, true) || sdk.checkNotifySign?.(params) || false;
  } catch {
    return false;
  }
}

function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}
