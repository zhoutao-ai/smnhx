export const PAYMENT_PROVIDER = 'alipay';
export const PAYMENT_PRODUCT_CODE = 'ziwei_ai_unlock_lifetime';

export interface PaymentProduct {
  code: string;
  subject: string;
  amount: string;
  currency: string;
}

export interface AlipayConfig {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  keyType: 'PKCS1' | 'PKCS8';
  sandbox: boolean;
}

export function getPaymentProduct(): PaymentProduct {
  return {
    code: PAYMENT_PRODUCT_CODE,
    subject: process.env.PAY_PRODUCT_SUBJECT ?? '紫微AI解读永久解锁',
    amount: normalizeAmount(process.env.PAY_PRODUCT_AMOUNT ?? '0.20'),
    currency: 'CNY',
  };
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zwdssm.top';
  return configured.replace(/\/+$/, '');
}

export function isPayEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PAY !== 'false';
}

export function isMockPay(): boolean {
  return process.env.MOCK_PAY === 'true';
}

export function getAlipayConfig(): AlipayConfig | null {
  const appId = process.env.ALIPAY_APP_ID;
  const privateKey = process.env.ALIPAY_PRIVATE_KEY;
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;

  if (!appId || !privateKey || !alipayPublicKey) return null;

  const keyType = process.env.ALIPAY_KEY_TYPE === 'PKCS8' ? 'PKCS8' : 'PKCS1';

  return {
    appId,
    privateKey: normalizePem(privateKey),
    alipayPublicKey: normalizePem(alipayPublicKey),
    keyType,
    sandbox: process.env.ALIPAY_SANDBOX === 'true',
  };
}

function normalizePem(value: string): string {
  return value.replace(/\\n/g, '\n').trim();
}

function normalizeAmount(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return '2.00';
  return parsed.toFixed(2);
}
