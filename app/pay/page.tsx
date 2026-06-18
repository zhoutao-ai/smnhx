'use client';

import { useState, useEffect } from 'react';
import { setUnlocked } from '@/lib/usage';

export default function PayPage() {
  const [step, setStep] = useState<'loading' | 'ready' | 'paid' | 'error'>('loading');
  const [outTradeNo, setOutTradeNo] = useState('');
  const [payUrl, setPayUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 支付功能关闭时显示提示
  if (process.env.NEXT_PUBLIC_ENABLE_PAY === 'false') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0e14', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      }}>
        <div style={{ textAlign: 'center', color: '#8899aa' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#e0e8f0', marginBottom: '8px' }}>支付功能暂未开放</div>
          <div style={{ fontSize: '13px' }}>支付宝接口正在申请中，敬请期待</div>
          <a href="/" style={{ display: 'inline-block', marginTop: '20px', color: '#60a5fa', fontSize: '13px', textDecoration: 'none' }}>← 返回首页</a>
        </div>
      </div>
    );
  }

  // 检查是否从支付宝同步跳回
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tradeNo = params.get('outTradeNo');
    const mockPaid = params.get('mock');

    // Mock 模式：直接标记支付成功
    if (mockPaid === 'paid' && tradeNo) {
      setOutTradeNo(tradeNo);
      verifyAndUnlock(tradeNo);
      return;
    }

    // 生产环境：从支付宝跳回，验证支付
    if (tradeNo) {
      setOutTradeNo(tradeNo);
      verifyAndUnlock(tradeNo);
      return;
    }

    // 首次进入：创建订单
    createOrder();
  }, []); // eslint-disable-line

  const createOrder = async () => {
    try {
      const res = await fetch('/api/pay/create', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setOutTradeNo(data.outTradeNo);
        if (data.mock) {
          // Mock 模式：直接跳回
          window.location.href = data.payUrl;
        } else {
          // 真实支付：跳转支付宝收银台
          setPayUrl(data.payUrl);
          setStep('ready');
        }
      } else {
        setErrorMsg(data.error ?? '创建订单失败');
        setStep('error');
      }
    } catch {
      setErrorMsg('网络异常，请稍后重试');
      setStep('error');
    }
  };

  const verifyAndUnlock = async (tradeNo: string) => {
    setStep('loading');
    try {
      const res = await fetch('/api/pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outTradeNo: tradeNo }),
      });
      const data = await res.json();
      if (data.paid) {
        setUnlocked(true);
        setStep('paid');
      } else {
        setErrorMsg('暂未收到付款，请确认已完成支付');
        setStep('ready');
      }
    } catch {
      setErrorMsg('验证失败，请重试');
      setStep('ready');
    }
  };

  const cardStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #fdf8ee 0%, #f5efe0 50%, #ede0c0 100%)',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  };

  const innerCard = {
    background: '#fff',
    borderRadius: '20px',
    padding: '40px 36px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center' as const,
    boxShadow: '0 12px 48px rgba(60,30,10,0.10), 0 2px 8px rgba(60,30,10,0.05)',
    border: '1px solid rgba(184,146,42,0.12)',
  };

  return (
    <div style={cardStyle}>
      <div style={innerCard}>
        {/* ══ 加载中 ══ */}
        {step === 'loading' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <p style={{ fontSize: '14px', color: '#8a7a50' }}>处理中…</p>
          </>
        )}

        {/* ══ 错误 ══ */}
        {step === 'error' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>😞</div>
            <p style={{ fontSize: '14px', color: '#c45a2d', marginBottom: '16px' }}>{errorMsg}</p>
            <button
              onClick={() => { setStep('loading'); createOrder(); }}
              style={{
                padding: '10px 28px', border: 'none', borderRadius: '10px',
                background: 'linear-gradient(135deg, #b8922a, #9a7a20)',
                color: '#fff', fontSize: '14px', cursor: 'pointer',
              }}
            >重试</button>
          </>
        )}

        {/* ══ 待支付 ══ */}
        {step === 'ready' && (
          <>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#8a7a50' }}>紫微 AI 解读 · 永久解锁</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 700, color: '#3d2f10', marginBottom: '24px' }}>
              ¥2<span style={{ fontSize: '18px', fontWeight: 400 }}>.00</span>
            </div>

            <p style={{ fontSize: '13px', color: '#8a7a50', marginBottom: '24px', lineHeight: 1.7 }}>
              点击下方按钮跳转支付宝完成支付<br />支付完成后自动返回本页
            </p>

            <a
              href={payUrl}
              style={{
                display: 'inline-block',
                padding: '14px 48px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #1677ff, #4096ff)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                boxShadow: '0 4px 16px rgba(22,119,255,0.3)',
              }}
            >
              前往支付宝支付
            </a>

            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => verifyAndUnlock(outTradeNo)}
                style={{
                  background: 'none', border: 'none', color: '#8a7a50',
                  fontSize: '12px', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                已完成支付，点击验证
              </button>
            </div>
          </>
        )}

        {/* ══ 支付成功 ══ */}
        {step === 'paid' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#3d2f10', marginBottom: '8px' }}>
              支付成功！
            </h2>
            <p style={{ fontSize: '13px', color: '#8a7a50', marginBottom: '20px', lineHeight: 1.6 }}>
              AI 解读已永久解锁，现在可以无限次使用了
            </p>
            <a
              href="/chart"
              style={{
                display: 'inline-block',
                padding: '12px 36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #b8922a, #d4a843)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              开始使用
            </a>
          </>
        )}
      </div>
    </div>
  );
}
