'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { remainingFree } from '@/lib/usage';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PaywallModal({ open, onClose }: PaywallModalProps) {

  const handlePay = () => {
    // 跳转到支付宝支付页面
    window.location.href = '/pay';
  };

  if (!open) return null;

  const left = remainingFree();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(20,12,2,0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(180deg, #fefcf6 0%, #faf3e3 100%)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '420px',
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(60,30,10,0.4), 0 4px 16px rgba(60,30,10,0.2)',
            border: '1px solid rgba(184,146,42,0.25)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
          }}
        >
          {/* ── 头部 ── */}
          <div style={{
            padding: '22px 28px 14px',
            borderBottom: '1px solid rgba(184,146,42,0.15)',
            background: 'linear-gradient(180deg, rgba(184,146,42,0.08) 0%, transparent 100%)',
            flexShrink: 0,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px', lineHeight: 1 }}>🔮</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#3d2f10', letterSpacing: '0.06em', margin: 0 }}>
              次数已达上限
            </h2>
            <p style={{ fontSize: '12px', color: '#8a7a50', marginTop: '6px', lineHeight: 1.5 }}>
              免费额度已用完（共 1 次），剩余 {left} 次
            </p>
          </div>

          {/* ── 内容区 ── */}
          <div style={{
            padding: '20px 28px 24px',
            textAlign: 'center',
          }}>
            {/* 付费说明 */}
            <div style={{
              padding: '12px 16px',
              background: 'rgba(184,146,42,0.06)',
              border: '1px solid rgba(184,146,42,0.18)',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{
                fontSize: '13px', color: '#5a4a30', lineHeight: 1.8, margin: 0,
              }}>
                支付 <strong style={{ color: '#c45a2d', fontSize: '18px' }}>¥2</strong> 即可<strong style={{ color: '#3d2f10' }}>永久解锁</strong> AI 解读
              </p>
              <p style={{
                fontSize: '11px', color: '#8a7a50', marginTop: '6px', lineHeight: 1.5,
              }}>
                一次付费，终身使用 · 支付宝扫码支付
              </p>
            </div>

            {/* 支付按钮 — 跳转到 /pay */}
            <button
              onClick={handlePay}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #1677ff 0%, #0050b3 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                letterSpacing: '0.1em',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(22,119,255,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              💰 支付宝支付 ¥2 · 永久解锁
            </button>

            {/* 底部说明 */}
            <p style={{
              fontSize: '10px', color: '#a09070', marginTop: '12px', lineHeight: 1.5,
            }}>
              支付遇到问题？请联系微信 suixinZT1204
            </p>
          </div>

          {/* ── 关闭按钮 ── */}
          <div style={{
            padding: '10px 22px 14px',
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#a09070',
                fontSize: '12px',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                padding: '4px 12px',
              }}
            >
              暂不需要
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
