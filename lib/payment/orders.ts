import { randomBytes } from 'crypto';
import { sql } from '@/lib/db/index';
import { PAYMENT_PROVIDER, type PaymentProduct } from './config';

export type PaymentStatus = 'pending' | 'paid' | 'closed' | 'failed';

export interface PaymentOrder {
  out_trade_no: string;
  trade_no: string | null;
  provider: string;
  product_code: string;
  subject: string;
  total_amount: string;
  currency: string;
  status: PaymentStatus;
  paid_at: string | null;
}

export function generateOutTradeNo(): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  return `ZW${stamp}${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function createPaymentOrder(outTradeNo: string, product: PaymentProduct): Promise<void> {
  await sql`
    INSERT INTO payments (
      out_trade_no, provider, product_code, subject, total_amount, currency, status, created_at, updated_at
    )
    VALUES (
      ${outTradeNo}, ${PAYMENT_PROVIDER}, ${product.code}, ${product.subject}, ${product.amount}, ${product.currency},
      'pending', NOW(), NOW()
    )
    ON CONFLICT (out_trade_no) DO NOTHING
  `;
}

export async function getPaymentOrder(outTradeNo: string): Promise<PaymentOrder | null> {
  const rows = await sql`
    SELECT out_trade_no, trade_no, provider, product_code, subject, total_amount, currency, status, paid_at
    FROM payments
    WHERE out_trade_no = ${outTradeNo}
    LIMIT 1
  ` as PaymentOrder[];
  return (rows[0] as PaymentOrder | undefined) ?? null;
}

export async function markPaymentPaid(input: {
  outTradeNo: string;
  tradeNo?: string;
  totalAmount?: string;
  buyerId?: string;
  buyerLogonId?: string;
  rawNotify?: Record<string, string>;
}): Promise<void> {
  await sql`
    UPDATE payments
    SET
      status = 'paid',
      trade_no = COALESCE(${input.tradeNo ?? null}, trade_no),
      total_amount = COALESCE(${input.totalAmount ?? null}, total_amount),
      buyer_id = COALESCE(${input.buyerId ?? null}, buyer_id),
      buyer_logon_id = COALESCE(${input.buyerLogonId ?? null}, buyer_logon_id),
      raw_notify = COALESCE(${input.rawNotify ? JSON.stringify(input.rawNotify) : null}::jsonb, raw_notify),
      paid_at = COALESCE(paid_at, NOW()),
      updated_at = NOW()
    WHERE out_trade_no = ${input.outTradeNo}
  `;
}

export async function markPaymentFailed(outTradeNo: string, status: PaymentStatus = 'failed'): Promise<void> {
  await sql`
    UPDATE payments
    SET status = ${status}, updated_at = NOW()
    WHERE out_trade_no = ${outTradeNo} AND status <> 'paid'
  `;
}

export function isPaidStatus(status?: string): boolean {
  return status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED';
}
