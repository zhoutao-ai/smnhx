'use client';
/**
 * TopBar — 命盘顶部工具栏
 *
 * 整合时间视图切换（命盘/大限/流年）、流年流月选择、分享、导出功能。
 * 使用已有的 TimeNav 组件作为时间导航核心。
 */

import { motion } from 'framer-motion';
import TimeNav, { type TimeView } from '@/components/TimeNav';
import type { ZiweiChart } from '@/lib/ziwei/types';

export { type TimeView } from '@/components/TimeNav';

interface TopBarProps {
  chart: ZiweiChart;
  view: TimeView;
  liunianYear: number;
  liuyueMonth: number;
  onViewChange: (view: TimeView) => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onShare?: () => void;
  onExport?: () => void;
  copied?: boolean;
}

export default function TopBar({
  chart,
  view,
  liunianYear,
  liuyueMonth: _liuyueMonth,
  onViewChange,
  onYearChange,
  onMonthChange: _onMonthChange,
  onShare,
  onExport,
  copied,
}: TopBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '8px 16px',
        borderBottom: '1px solid var(--t-border)',
        background: 'var(--t-bg)',
      }}
    >
      {/* 时间导航：命盘 / 大限 / 流年 */}
      <TimeNav
        chart={chart}
        view={view}
        liunianYear={liunianYear}
        onViewChange={onViewChange}
        onYearChange={onYearChange}
      />

      {/* 操作按钮组 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {onShare && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onShare}
            style={{
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid var(--t-border)',
              background: 'transparent',
              color: copied ? 'var(--t-gold)' : 'var(--t-faint)',
              cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            {copied ? '✓ 已复制' : '分享'}
          </motion.button>
        )}
        {onExport && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onExport}
            style={{
              fontSize: '11px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid var(--t-border)',
              background: 'transparent',
              color: 'var(--t-faint)',
              cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            打印
          </motion.button>
        )}
      </div>
    </div>
  );
}
