/**
 * 命盘指纹生成 & 相似度计算
 *
 * 指纹是命盘的核心特征向量，用于快速检索相似命盘。
 * 不存储具体数值，只存储结构化特征。
 */

import type { ZiweiChart } from '@/lib/ziwei/types';
import type { ChartFingerprint } from './types';
import { detectPatterns } from '@/lib/ziwei/patterns';

/** 从命盘生成指纹 */
export function generateFingerprint(chart: ZiweiChart): ChartFingerprint {
  const mingPalace = chart.palaces.find(p => p.isMingGong);
  const shenPalace = chart.palaces.find(p => p.isShenGong);

  // 各宫主星映射
  const starMap: Record<string, string[]> = {};
  for (const palace of chart.palaces) {
    const majors = palace.stars
      .filter(s => s.type === 'major')
      .map(s => s.name);
    if (majors.length > 0) {
      starMap[palace.name] = majors;
    }
  }

  // 四化映射
  const sihuaMap: Record<string, string> = {};
  for (const palace of chart.palaces) {
    for (const star of palace.stars) {
      if (star.siHua) {
        sihuaMap[star.name] = star.siHua;
      }
    }
  }

  // 格局
  const patterns = detectPatterns(chart).map((p: any) => p.name);

  return {
    mingStars: mingPalace?.stars.filter(s => s.type === 'major').map(s => s.name) ?? [],
    mingBranch: chart.mingGongBranch,
    shenBranch: chart.shenGongBranch,
    wuxingJu: chart.wuxingJu,
    starMap,
    sihuaMap,
    patterns,
    gender: chart.birthInfo.gender,
    yearStem: chart.lunarInfo.yearStem,
  };
}

/**
 * 计算两个指纹的相似度 (0-1)
 *
 * 权重分配：
 * - 命宫主星相同: 0.30
 * - 命宫地支相同: 0.10
 * - 五行局相同: 0.05
 * - 四化重叠率: 0.20
 * - 格局重叠率: 0.15
 * - 星曜分布重叠率: 0.20
 */
export function computeSimilarity(a: ChartFingerprint, b: ChartFingerprint): number {
  let score = 0;

  // 1. 命宫主星重叠 (max 0.30)
  const mingOverlap = intersectSize(new Set(a.mingStars), new Set(b.mingStars));
  const mingTotal = new Set([...a.mingStars, ...b.mingStars]).size || 1;
  score += 0.30 * (mingOverlap / mingTotal);

  // 2. 命宫地支相同 (max 0.10)
  score += a.mingBranch === b.mingBranch ? 0.10 : 0;

  // 3. 五行局相同 (max 0.05)
  score += a.wuxingJu === b.wuxingJu ? 0.05 : 0;

  // 4. 四化重叠 (max 0.20)
  const sihuaA = Object.entries(a.sihuaMap).map(([k, v]) => `${k}:${v}`);
  const sihuaB = Object.entries(b.sihuaMap).map(([k, v]) => `${k}:${v}`);
  const sihuaOverlap = intersectSize(new Set(sihuaA), new Set(sihuaB));
  const sihuaTotal = new Set([...sihuaA, ...sihuaB]).size || 1;
  score += 0.20 * (sihuaOverlap / sihuaTotal);

  // 5. 格局重叠 (max 0.15)
  const patOverlap = intersectSize(new Set(a.patterns), new Set(b.patterns));
  const patTotal = new Set([...a.patterns, ...b.patterns]).size || 1;
  score += 0.15 * (patOverlap / patTotal);

  // 6. 星曜分布重叠 (max 0.20)
  const starKeysA = Object.entries(a.starMap).map(([p, stars]) =>
    stars.map(s => `${p}:${s}`),
  ).flat();
  const starKeysB = Object.entries(b.starMap).map(([p, stars]) =>
    stars.map(s => `${p}:${s}`),
  ).flat();
  const starOverlap = intersectSize(new Set(starKeysA), new Set(starKeysB));
  const starTotal = new Set([...starKeysA, ...starKeysB]).size || 1;
  score += 0.20 * (starOverlap / starTotal);

  return Math.min(1, score);
}

function intersectSize<T>(a: Set<T>, b: Set<T>): number {
  let count = 0;
  for (const item of a) {
    if (b.has(item)) count++;
  }
  return count;
}
