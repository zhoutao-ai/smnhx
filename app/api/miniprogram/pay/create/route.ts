import { NextResponse } from 'next/server';
import { getPaymentProduct, isPayEnabled } from '@/lib/payment/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUIRED_ENV = [
  'WECHAT_MINI_APP_ID',
  'WECHAT_MCH_ID',
  'WECHAT_PAY_API_V3_KEY',
  'WECHAT_PAY_PRIVATE_KEY',
  'WECHAT_PAY_CERT_SERIAL_NO',
];

export async function POST(request: Request) {
  if (!isPayEnabled()) {
    return NextResponse.json({ success: false, error: '支付功能暂未开放' }, { status: 403 });
  }

  const missing = REQUIRED_ENV.filter(name => !process.env[name]);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `微信支付尚未配置：${missing.join(', ')}`,
      },
      { status: 501 },
    );
  }

  const product = getPaymentProduct();
  const body = await request.json().catch(() => ({} as { code?: string }));

  if (!body.code) {
    return NextResponse.json(
      {
        success: false,
        amount: product.amount,
        subject: product.subject,
        error: '缺少 wx.login 返回的 code，无法换取 openid。',
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      success: false,
      amount: product.amount,
      subject: product.subject,
      error: '微信支付统一下单签名逻辑待接入。需要商户号、API v3 key、商户私钥、证书序列号和用户 openid。',
    },
    { status: 501 },
  );
}
