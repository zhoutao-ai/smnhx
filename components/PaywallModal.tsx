'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { remainingFree } from '@/lib/usage';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PaywallModal({ open, onClose }: PaywallModalProps) {
  if (!open) return null;

  const left = remainingFree();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={styles.backdrop}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={(event) => event.stopPropagation()}
          style={styles.dialog}
        >
          <div style={styles.header}>
            <h2 style={styles.title}>免费次数已用完</h2>
            <p style={styles.subtitle}>当前剩余免费次数：{left}</p>
          </div>

          <div style={styles.body}>
            <div style={styles.offer}>
              <span style={styles.price}>¥2.9</span>
              <span>解锁永久 AI 解读命盘</span>
            </div>

            <button style={styles.payButton} onClick={() => { window.location.href = '/pay'; }}>
              支付宝支付
            </button>

            <p style={styles.help}>支付遇到问题，请联系微信 suixinZT1204。</p>
            <button onClick={onClose} style={styles.closeButton}>暂不需要</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(20, 12, 2, 0.82)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  dialog: {
    width: '100%',
    maxWidth: '420px',
    overflow: 'hidden',
    borderRadius: '8px',
    background: '#fffdf8',
    border: '1px solid rgba(184, 146, 42, 0.25)',
    boxShadow: '0 24px 80px rgba(60, 30, 10, 0.35)',
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  },
  header: {
    padding: '22px 26px 14px',
    borderBottom: '1px solid rgba(184, 146, 42, 0.16)',
    textAlign: 'center',
  },
  title: {
    margin: 0,
    color: '#32260f',
    fontSize: '19px',
    fontWeight: 800,
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#8a7a50',
    fontSize: '13px',
  },
  body: {
    padding: '20px 26px 24px',
    textAlign: 'center',
  },
  offer: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '18px',
    color: '#4d3b18',
    fontSize: '14px',
  },
  price: {
    color: '#c45a2d',
    fontSize: '30px',
    fontWeight: 800,
  },
  payButton: {
    width: '100%',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '8px',
    background: '#1677ff',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  help: {
    margin: '12px 0 0',
    color: '#9a8b68',
    fontSize: '11px',
    lineHeight: 1.6,
  },
  closeButton: {
    marginTop: '12px',
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    color: '#8a7a50',
    fontSize: '12px',
    cursor: 'pointer',
  },
};
