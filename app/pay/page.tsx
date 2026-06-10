'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { setUnlocked } from '@/lib/usage';

export default function PayPage() {
  const [step, setStep] = useState<'loading' | 'ready' | 'paid' | 'error'>('loading');

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
  const [qrCode, setQrCode] = useState('');
  const [outTradeNo, setOutTradeNo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);

  // 检测移动端 & 沙箱模式
  useEffect(() => {
    setIsMobile(/Alipay|iPhone|Android/i.test(navigator.userAgent));
    setIsSandbox(process.env.NEXT_PUBLIC_ALIPAY_SANDBOX === 'true');
  }, []);

  // 创建订单
  useEffect(() => {
    const createOrder = async () => {
      try {
        const res = await fetch('/api/pay/create', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setQrCode(data.qrCode);
          setOutTradeNo(data.outTradeNo);
          setStep('ready');
        } else {
          setErrorMsg(data.error ?? '创建订单失败');
          setStep('error');
        }
      } catch {
        setErrorMsg('网络异常，请稍后重试');
        setStep('error');
      }
    };
    createOrder();
  }, []);

  // 轮询支付状态（每 3 秒查一次）
  useEffect(() => {
    if (step !== 'ready' || !outTradeNo) return;

    pollingRef.current = setInterval(async () => {
      try {
        setPollCount(c => c + 1);
        const res = await fetch('/api/pay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outTradeNo }),
        });
        const data = await res.json();
        if (data.paid) {
          setUnlocked(true);
          setStep('paid');
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch { /* 继续轮询 */ }
    }, 3000);

    // 最多轮询 5 分钟
    const timeout = setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        setErrorMsg('支付超时，请确认是否已完成付款');
        setStep('error');
      }
    }, 5 * 60 * 1000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      clearTimeout(timeout);
    };
  }, [step, outTradeNo]);

  // 手动验证支付（传 manual:true，mock 模式下仅手动确认才通过）
  const handleVerify = async () => {
    if (!outTradeNo) {
      // mock 模式下可能没有真实订单号，直接解锁
      setUnlocked(true);
      setStep('paid');
      return;
    }
    try {
      const res = await fetch('/api/pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outTradeNo, manual: true }),
      });
      const data = await res.json();
      if (data.paid) {
        setUnlocked(true);
        setStep('paid');
        if (pollingRef.current) clearInterval(pollingRef.current);
      } else {
        alert('暂未收到付款，请确认已扫码支付');
      }
    } catch {
      alert('网络异常，请稍后重试');
    }
  };

  // 唤起支付宝 APP
  const handleOpenAlipay = () => {
    const alipayScheme = `alipays://platformapi/startapp?saId=10000007&qrcode=${encodeURIComponent(qrCode)}`;
    window.open(alipayScheme, '_blank');
    setTimeout(() => {
      window.open(qrCode, '_blank');
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #faf8f2 0%, #f3ede0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '32px 28px',
          maxWidth: '380px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 12px 48px rgba(60,30,10,0.12), 0 2px 8px rgba(60,30,10,0.06)',
          border: '1px solid rgba(184,146,42,0.15)',
        }}
      >
        {/* ══ 加载中 ══ */}
        {step === 'loading' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <p style={{ fontSize: '14px', color: '#8a7a50' }}>正在创建订单…</p>
          </>
        )}

        {/* ══ 错误 ══ */}
        {step === 'error' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>😞</div>
            <p style={{ fontSize: '14px', color: '#c45a2d', marginBottom: '16px' }}>
              {errorMsg}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #b8922a, #9a7a20)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              重试
            </button>
          </>
        )}

        {/* ══ 待支付 ══ */}
        {step === 'ready' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#8a7a50' }}>紫微 AI 解读 · 永久解锁</span>
              {isSandbox && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(255,152,0,0.15)',
                  color: '#e65100',
                  border: '1px solid rgba(255,152,0,0.3)',
                  fontWeight: 500,
                }}>
                  🧪 沙箱
                </span>
              )}
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#3d2f10', marginBottom: '20px' }}>
              ¥2<span style={{ fontSize: '16px', fontWeight: 400 }}>.00</span>
            </div>

            {/* QR 码 */}
            <div style={{
              padding: '16px',
              background: '#fafaf8',
              borderRadius: '12px',
              border: '1px solid rgba(184,146,42,0.12)',
              marginBottom: '16px',
              display: 'inline-block',
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                alt="支付宝收款码"
                width={200}
                height={200}
                style={{ display: 'block' }}
              />
            </div>

            <p style={{ fontSize: '12px', color: '#8a7a50', marginBottom: '20px', lineHeight: 1.6 }}>
              {isMobile
                ? '点击下方按钮，用支付宝扫码或直接跳转支付'
                : '打开支付宝「扫一扫」扫描上方二维码'}
            </p>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isMobile && (
                <button
                  onClick={handleOpenAlipay}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #1677ff 0%, #0050b3 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(22,119,255,0.3)',
                  }}
                >
                  打开支付宝支付
                </button>
              )}

              <button
                onClick={handleVerify}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #b8922a 0%, #9a7a20 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(184,146,42,0.25)',
                }}
              >
                已完成支付
              </button>
            </div>

            {/* 轮询提示 */}
            {pollCount > 0 && (
              <p style={{ fontSize: '10px', color: '#a09070', marginTop: '12px' }}>
                已查询 {pollCount} 次，支付后自动跳转
              </p>
            )}

            <p style={{ fontSize: '10px', color: '#a09070', marginTop: '8px', lineHeight: 1.5 }}>
              支付遇到问题？请联系微信 suixinZT1204
            </p>
          </>
        )}

        {/* ══ 支付成功 ══ */}
        {step === 'paid' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#3d2f10', margin: '0 0 8px' }}>
              支付成功！
            </h2>
            <p style={{ fontSize: '14px', color: '#8a7a50', marginBottom: '20px', lineHeight: 1.6 }}>
              AI 解读已永久解锁，现在可以无限次使用了
            </p>
            <button
              onClick={() => {
                window.location.href = '/chart';
              }}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #b8922a 0%, #9a7a20 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(184,146,42,0.3)',
              }}
            >
              返回命盘 →
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
