/**
 * 支付宝当面付客户端
 *
 * 使用 alipay-sdk v4 + exec() 传统 API
 *
 * 配置环境变量：
 *   ALIPAY_APP_ID          - 应用 ID
 *   ALIPAY_PRIVATE_KEY     - 应用私钥（PKCS1 或 PKCS8）
 *   ALIPAY_PUBLIC_KEY      - 支付宝公钥
 *   ALIPAY_KEY_TYPE        - 私钥类型，默认 PKCS1（PKCS8 需显式指定）
 *   ALIPAY_SANDBOX         - 是否使用沙箱环境（true/false）
 *
 * 沙箱环境：https://openhome.alipaydev.com/develop/sandbox/app
 * 参考：https://opendocs.alipay.com/open/02ekfj
 */

import { AlipaySdk, type AlipaySdkConfig } from 'alipay-sdk';

/** 是否沙箱环境 */
export function isSandbox(): boolean {
  return process.env.ALIPAY_SANDBOX === 'true';
}

function getAlipayConfig(): AlipaySdkConfig | null {
  const appId = process.env.ALIPAY_APP_ID;
  const privateKey = process.env.ALIPAY_PRIVATE_KEY;
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;

  if (!appId || !privateKey || !alipayPublicKey) {
    return null;
  }

  // 沙箱环境特殊处理
  if (isSandbox()) {
    // 1. SSL 证书过期问题
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    // 2. 绕过企业/系统代理，直连沙箱网关
    process.env.NO_PROXY = [process.env.NO_PROXY, 'alipaydev.com', 'alipay.net']
      .filter(Boolean)
      .join(',');
    // 3. 清除可能干扰的代理变量
    if (process.env.HTTPS_PROXY) {
      process.env.NODE_EXTRA_CA_CERTS = process.env.NODE_EXTRA_CA_CERTS ?? '';
    }
  }

  return {
    appId,
    privateKey: privateKey.replace(/\\n/g, '\n'), // 支持 \n 转义
    alipayPublicKey: alipayPublicKey.replace(/\\n/g, '\n'),
    signType: 'RSA2',
    keyType: (process.env.ALIPAY_KEY_TYPE as 'PKCS1' | 'PKCS8') ?? 'PKCS1',
    // 沙箱网关 vs 生产网关
    gateway: isSandbox()
      ? 'https://openapi.alipaydev.com/gateway.do'
      : 'https://openapi.alipay.com/gateway.do',
    timeout: 30000, // 沙箱可能较慢，给 30 秒
    charset: 'utf-8',
    version: '1.0',
  };
}

let sdk: AlipaySdk | null = null;

function getSdk(): AlipaySdk | null {
  if (sdk) return sdk;
  const config = getAlipayConfig();
  if (!config) return null;
  sdk = new AlipaySdk(config);
  return sdk;
}

/** 生成唯一订单号 */
export function generateOutTradeNo(): string {
  const now = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `ZIWEI_${now}_${rand}`;
}

export interface CreateOrderResult {
  success: boolean;
  qrCode?: string;
  outTradeNo?: string;
  error?: string;
}

/**
 * 创建当面付预下单，返回 QR 码链接
 * alipay.trade.precreate
 */
export async function createPrecreate(
  outTradeNo: string,
  totalAmount: string,
  subject: string,
): Promise<CreateOrderResult> {
  const client = getSdk();
  if (!client) {
    return { success: false, error: '支付宝未配置（缺少 ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY）' };
  }

  try {
    const result = await client.exec('alipay.trade.precreate', {
      bizContent: {
        out_trade_no: outTradeNo,
        total_amount: totalAmount,
        subject,
      },
    });

    if (result.code === '10000') {
      return {
        success: true,
        qrCode: result.qr_code as string,
        outTradeNo: result.out_trade_no as string,
      };
    }

    return {
      success: false,
      error: `${result.sub_msg ?? result.msg ?? '未知错误'} (${result.sub_code ?? result.code})`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '支付宝请求异常';
    return { success: false, error: msg };
  }
}

export interface QueryOrderResult {
  success: boolean;
  paid: boolean;
  tradeStatus?: string;
  error?: string;
}

/**
 * 查询订单支付状态
 * alipay.trade.query
 */
export async function queryOrder(outTradeNo: string): Promise<QueryOrderResult> {
  const client = getSdk();
  if (!client) {
    return { success: false, paid: false, error: '支付宝未配置' };
  }

  try {
    const result = await client.exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: outTradeNo,
      },
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
    const msg = e instanceof Error ? e.message : '支付宝请求异常';
    return { success: false, paid: false, error: msg };
  }
}
