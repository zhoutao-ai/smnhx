'use client';

import { useState, useEffect, useRef } from 'react';
import { setUnlocked } from '@/lib/usage';

export default function PayPage() {
  const [step, setStep] = useState<'loading' | 'paying' | 'paid' | 'error'>('loading');
  const [outTradeNo, setOutTradeNo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  // 支付关闭
  if (process.env.NEXT_PUBLIC_ENABLE_PAY === 'false') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0e14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#8899aa' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#e0e8f0', marginBottom: '8px' }}>支付功能暂未开放</div>
          <div style={{ fontSize: '13px' }}>支付宝接口正在申请中，敬请期待</div>
          <a href="/" style={{ display: 'inline-block', marginTop: '20px', color: '#60a5fa', fontSize: '13px', textDecoration: 'none' }}>← 返回首页</a>
        </div>
      </div>
    );
  }

  // 初始化
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tradeNo = params.get('outTradeNo');
    const mockPaid = params.get('mock');

    if (mockPaid === 'paid' && tradeNo) { unlock(tradeNo); return; }
    if (tradeNo) { unlock(tradeNo); return; }
    createOrder();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []); // eslint-disable-line

  // ─── 创建订单 ──────────────────────────────────────────
  const createOrder = async () => {
    try {
      const res = await fetch('/api/pay/create', { method: 'POST' });
      const data = await res.json();
      if (!data.success) { setErrorMsg(data.error ?? '创建订单失败'); setStep('error'); return; }
      setOutTradeNo(data.outTradeNo);

      // Mock 模式
      if (data.mock) { window.location.href = data.payUrl; return; }

      // 真实支付：渲染表单并自动提交
      if (data.payForm) {
        submitForm(data.payForm);
        setStep('paying');
        pollingRef.current = setInterval(() => checkPayment(data.outTradeNo), 3000);
      } else {
        setErrorMsg('未获取到支付表单');
        setStep('error');
      }
    } catch { setErrorMsg('网络异常'); setStep('error'); }
  };

  // ─── 原生 DOM 提交表单（不受 React 影响）─────────────────
  const submitForm = (formHtml: string) => {
    // 创建一个脱离 React 的 div
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);
    container.innerHTML = formHtml;
    const form = container.querySelector('form');
    if (form) {
      (form as HTMLFormElement).submit();
    }
  };

  // ─── 查询支付状态 ──────────────────────────────────────
  const checkPayment = async (tradeNo: string) => {
    try {
      const res = await fetch('/api/pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outTradeNo: tradeNo }),
      });
      const data = await res.json();
      if (data.paid) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setUnlocked(true);
        setStep('paid');
      }
    } catch { /* continue polling */ }
  };

  // ─── 手动验证 ──────────────────────────────────────────
  const handleVerify = async () => {
    if (!outTradeNo) return;
    try {
      const res = await fetch('/api/pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outTradeNo, manual: true }),
      });
      const data = await res.json();
      if (data.paid) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setUnlocked(true);
        setStep('paid');
      } else { alert('暂未收到付款'); }
    } catch { alert('验证失败'); }
  };

  // ─── 解锁 ──────────────────────────────────────────────
  const unlock = async (tradeNo: string) => {
    setStep('loading');
    await checkPayment(tradeNo);
    if (step === 'loading') setTimeout(() => checkPayment(tradeNo), 3000);
  };

  // ─── UI ────────────────────────────────────────────────
  const card = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(180deg, #fdf8ee 0%, #f5efe0 50%, #ede0c0 100%)',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  };
  const inner = {
    background: '#fff', borderRadius: '20px', padding: '40px 36px',
    maxWidth: '420px', width: '100%', textAlign: 'center' as const,
    boxShadow: '0 12px 48px rgba(60,30,10,0.08), 0 2px 8px rgba(60,30,10,0.04)',
    border: '1px solid rgba(184,146,42,0.10)',
  };

  return (
    <div style={card}>
      <div style={inner}>
        {step === 'loading' && (
          <><div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div><p style={{ fontSize: '14px', color: '#8a7a50' }}>处理中…</p></>
        )}
        {step === 'error' && (
          <><div style={{ fontSize: '32px', marginBottom: '12px' }}>😞</div>
            <p style={{ fontSize: '14px', color: '#c45a2d', marginBottom: '16px' }}>{errorMsg}</p>
            <button onClick={createOrder} style={{ padding: '10px 24px', border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg,#b8922a,#9a7a20)', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>重试</button></>
        )}
        {step === 'paying' && (
          <>
            <div style={{ fontSize: '14px', color: '#8a7a50', marginBottom: '4px' }}>紫微 AI 解读 · 永久解锁</div>
            <div style={{ fontSize: '40px', fontWeight: 700, color: '#3d2f10', marginBottom: '20px' }}>¥2.00</div>
            <p style={{ fontSize: '13px', color: '#8a7a50', marginBottom: '20px' }}>正在跳转支付宝收银台…</p>
            <button onClick={handleVerify}
              style={{ background: 'none', border: 'none', color: '#8a7a50', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
              已完成支付，点击验证
            </button>
          </>
        )}
        {step === 'paid' && (
          <><div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#3d2f10', marginBottom: '8px' }}>支付成功！</h2>
            <p style={{ fontSize: '13px', color: '#8a7a50', marginBottom: '20px' }}>AI 解读已永久解锁</p>
            <a href="/chart" style={{ display: 'inline-block', padding: '12px 36px', borderRadius: '10px', background: 'linear-gradient(135deg,#b8922a,#d4a843)', color: '#fff', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>开始使用</a></>
        )}
      </div>
    </div>
  );
}
