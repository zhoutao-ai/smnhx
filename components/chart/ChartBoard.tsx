'use client';
/**
 * ChartBoard 适配器 — 对齐 refactored 版 API 到已有的 ChartBoard 组件
 *
 * refactored 版 props: { chart, view, liunianYear, onStarClick, onPalaceClick,
 *                         onSiHuaBadgeClick, onTimeViewChange }
 *
 * 原始 ChartBoard 版: { chart, onStarSelect, onPalaceSelect, onSiHuaClick }
 */

import OriginalChartBoard from '@/components/ChartBoard';
import type { ZiweiChart, Star, Palace } from '@/lib/ziwei/types';
import type { TimeView } from '@/components/chart/TopBar';

interface ChartBoardProps {
  chart: ZiweiChart;
  view: TimeView;
  liunianYear: number;
  onStarClick?: (star: Star, palace: Palace) => void;
  onPalaceClick?: (palace: Palace) => void;
  onSiHuaBadgeClick?: (starName: string, siHua: string, view: TimeView) => void;
  onTimeViewChange?: (view: TimeView) => void;
}

export default function ChartBoard({
  chart,
  onStarClick,
  onPalaceClick,
  onSiHuaBadgeClick,
}: ChartBoardProps) {
  return (
    <OriginalChartBoard
      chart={chart}
      onStarSelect={onStarClick}
      onPalaceSelect={onPalaceClick}
      onSiHuaClick={onSiHuaBadgeClick}
    />
  );
}
