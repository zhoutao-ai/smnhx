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
    subject: process.env.PAY_PRODUCT_SUBJECT ?? '2.9元解锁永久AI解读命盘',
    amount: normalizeAmount(process.env.PAY_PRODUCT_AMOUNT ?? '2.90'),
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
    privateKey: normalizePrivateKey(privateKey, keyType),
    alipayPublicKey: normalizePublicKey(alipayPublicKey),
    keyType,
    sandbox: process.env.ALIPAY_SANDBOX === 'true',
  };
}

function normalizePrivateKey(value: string, keyType: 'PKCS1' | 'PKCS8'): string {
  return normalizePem(value, keyType === 'PKCS8' ? 'PRIVATE KEY' : 'RSA PRIVATE KEY');
}

function normalizePublicKey(value: string): string {
  return normalizePem(value, 'PUBLIC KEY');
}

function normalizePem(value: string, label: string): string {
  const normalized = value.replace(/\\n/g, '\n').trim();
  if (normalized.includes('-----BEGIN')) return normalized;

  const compact = normalized.replace(/\s+/g, '');
  const lines = compact.match(/.{1,64}/g)?.join('\n') ?? compact;
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

function normalizeAmount(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return '2.90';
  return parsed.toFixed(2);
}
