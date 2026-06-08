'use client';
/**
 * InsightPanel 适配器 — 将 refactored 版 FocusState 映射到原始组件 props
 */

import OriginalInsightPanel from '@/components/InsightPanel';
import type { ZiweiChart, Palace, Star } from '@/lib/ziwei/types';
import type { TimeView } from '@/components/TimeNav';

// ─── FocusState（chart/page.tsx 使用的聚合聚焦类型） ────────────
export interface FocusState {
  type?: string;
  label?: string;
  palace?: Palace | null;
  star?: Star | null;
  siHua?: string | { starName: string; siHua: string; view: TimeView } | null;
}

interface InsightPanelProps {
  chart: ZiweiChart;
  focus?: FocusState | null;
  view?: string;         // passed by chart/page but unused
  liunianYear?: number;  // passed by chart/page but unused
  liuyueMonth?: number;  // passed by chart/page but unused
  onClearFocus?: () => void; // passed by chart/page but unused
}

export default function InsightPanel({ chart, focus }: InsightPanelProps) {
  // 将 FocusState 拆解为原始 InsightPanel 的两个独立 prop
  const selectedPalace = focus?.palace ?? null;

  // siHua 可能是 string 或 object，原始组件期望 object | null
  const siHuaRaw = focus?.siHua;
  const selectedSiHua =
    siHuaRaw && typeof siHuaRaw === 'object'
      ? {
          starName: siHuaRaw.starName,
          siHua: siHuaRaw.siHua,
          view: siHuaRaw.view,
        }
      : null;

  return (
    <OriginalInsightPanel
      chart={chart}
      selectedPalace={selectedPalace}
      selectedSiHua={selectedSiHua}
    />
  );
}
