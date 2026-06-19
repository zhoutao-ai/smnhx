'use client';

import { useEffect, useRef, useState } from 'react';
import { setUnlocked } from '@/lib/usage';

type PayStep = 'loading' | 'ready' | 'redirecting' | 'checking' | 'paid' | 'error';

interface PayCreateResponse {
  success: boolean;
  mock?: boolean;
  outTradeNo?: string;
  amount?: string;
  subject?: string;
  payForm?: string;
  payUrl?: string;
  error?: string;
}

interface PayVerifyResponse {
  success: boolean;
  paid: boolean;
  status?: string;
  tradeStatus?: string;
  error?: string;
}

export default function PayPage() {
  const [step, setStep] = useState<PayStep>('loading');
  const [outTradeNo, setOutTradeNo] = useState('');
  const [amount, setAmount] = useState('2.00');
  const [subject, setSubject] = useState('紫微AI解读永久解锁');
  const [payForm, setPayForm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedTradeNo = params.get('outTradeNo');

    if (returnedTradeNo) {
      setOutTradeNo(returnedTradeNo);
      setStep('checking');
      void verifyPayment(returnedTradeNo, true);
      startPolling(returnedTradeNo);
      return stopPolling;
    }

    void createOrder();
    return stopPolling;
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = (tradeNo: string) => {
    stopPolling();
    pollingRef.current = setInterval(() => {
      void verifyPayment(tradeNo);
    }, 3000);
  };

  const createOrder = async () => {
    setStep('loading');
    setErrorMsg('');
    setPayForm('');

    try {
      const response = await fetch('/api/pay/create', { method: 'POST' });
      const data = (await response.json()) as PayCreateResponse;

      if (!response.ok || !data.success || !data.outTradeNo) {
        throw new Error(data.error ?? '创建订单失败');
      }

      setOutTradeNo(data.outTradeNo);
      setAmount(data.amount ?? '2.00');
      setSubject(data.subject ?? '紫微AI解读永久解锁');

      if (data.mock && data.payUrl) {
        window.location.href = data.payUrl;
        return;
      }

      if (!data.payForm) throw new Error('未获取到支付宝支付表单');

      setPayForm(data.payForm);
      setStep('ready');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '创建订单失败');
      setStep('error');
    }
  };

  const handlePay = () => {
    if (!payForm || !outTradeNo) {
      setErrorMsg('订单尚未准备好，请重新创建订单');
      setStep('error');
      return;
    }

    try {
      setStep('redirecting');
      startPolling(outTradeNo);
      submitAlipayForm(payForm);
    } catch (error) {
      stopPolling();
      setErrorMsg(error instanceof Error ? error.message : '跳转支付宝失败');
      setStep('error');
    }
  };

  const submitAlipayForm = (formHtml: string) => {
    const oldContainer = document.getElementById('alipay-submit-container');
    if (oldContainer) oldContainer.remove();

    const container = document.createElement('div');
    container.id = 'alipay-submit-container';
    container.style.display = 'none';
    document.body.appendChild(container);
    container.innerHTML = formHtml;

    const form = container.querySelector('form');
    if (!form) {
      container.remove();
      throw new Error('支付宝表单解析失败');
    }

    (form as HTMLFormElement).submit();
  };

  const verifyPayment = async (tradeNo = outTradeNo, showPending = false) => {
    if (!tradeNo) return;

    try {
      const response = await fetch('/api/pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outTradeNo: tradeNo }),
      });
      const data = (await response.json()) as PayVerifyResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? '支付状态查询失败');
      }

      if (data.paid) {
        stopPolling();
        setUnlocked(true);
        setStep('paid');
        return;
      }

      if (showPending) setStep('checking');
    } catch (error) {
      if (showPending) {
        setErrorMsg(error instanceof Error ? error.message : '支付状态查询失败');
        setStep('error');
      }
    }
  };

  const busy = step === 'loading' || step === 'redirecting';

  return (
    <main style={styles.page}>
      <section style={styles.panel}>
        <div style={styles.kicker}>支付宝手机 H5 支付</div>
        <h1 style={styles.title}>{subject}</h1>
        <div style={styles.price}>¥{amount}</div>

        {step === 'loading' && <p style={styles.muted}>正在创建订单...</p>}

        {step === 'ready' && (
          <>
            <p style={styles.muted}>订单已创建，请在手机浏览器中打开支付宝完成付款。</p>
            <button style={styles.primaryButton} onClick={handlePay}>
              打开支付宝支付
            </button>
          </>
        )}

        {step === 'redirecting' && <p style={styles.muted}>正在打开支付宝 H5 收银台...</p>}

        {step === 'checking' && (
          <>
            <p style={styles.muted}>如果你已经完成付款，系统会自动确认到账。</p>
            <button style={styles.primaryButton} onClick={() => verifyPayment(outTradeNo, true)}>
              我已完成支付
            </button>
          </>
        )}

        {step === 'paid' && (
          <>
            <p style={styles.success}>支付成功，AI 解读已解锁。</p>
            <a href="/chart" style={styles.primaryLink}>开始使用</a>
          </>
        )}

        {step === 'error' && (
          <>
            <p style={styles.error}>{errorMsg}</p>
            <button style={styles.primaryButton} onClick={createOrder} disabled={busy}>
              重新创建订单
            </button>
          </>
        )}

        {outTradeNo && <div style={styles.orderNo}>订单号：{outTradeNo}</div>}
        <a href="/chart" style={styles.secondaryLink}>返回排盘页</a>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#f8f3e7',
    color: '#312610',
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
  },
  panel: {
    width: '100%',
    maxWidth: '420px',
    padding: '30px 26px',
    borderRadius: '8px',
    background: '#fffdf8',
    border: '1px solid rgba(150, 113, 37, 0.2)',
    boxShadow: '0 20px 60px rgba(66, 44, 8, 0.12)',
    textAlign: 'center',
  },
  kicker: {
    color: '#1677ff',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '21px',
    lineHeight: 1.35,
  },
  price: {
    margin: '18px 0 22px',
    fontSize: '42px',
    fontWeight: 800,
    color: '#9b6b0d',
  },
  muted: {
    margin: '0 0 18px',
    color: '#766844',
    fontSize: '14px',
    lineHeight: 1.7,
  },
  success: {
    margin: '0 0 18px',
    color: '#167241',
    fontSize: '15px',
    fontWeight: 700,
  },
  error: {
    margin: '0 0 18px',
    color: '#b42318',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  primaryButton: {
    width: '100%',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 18px',
    background: '#1677ff',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  primaryLink: {
    display: 'block',
    borderRadius: '8px',
    padding: '12px 18px',
    background: '#1677ff',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    textDecoration: 'none',
  },
  secondaryLink: {
    display: 'inline-block',
    marginTop: '18px',
    color: '#7b6a42',
    fontSize: '13px',
    textDecoration: 'none',
  },
  orderNo: {
    marginTop: '16px',
    wordBreak: 'break-all',
    color: '#9a8b68',
    fontSize: '11px',
  },
};
