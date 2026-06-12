/**
 * RAG 检索模块
 *
 * 从数据库检索与当前命盘最相似的样本，提取解读文本作为 few-shot 参考。
 */

import { sql } from '@/lib/db/index';
import { generateFingerprint, computeSimilarity } from './fingerprint';
import type { ZiweiChart } from '@/lib/ziwei/types';
import type { ChartFingerprint, RagResult } from './types';

const TOP_K = 3;
const MIN_SCORE = 0.30;

/** 查找前 TOP_K 个最相似的命盘样本 */
export async function retrieveSimilarSamples(
  chart: ZiweiChart,
): Promise<RagResult[]> {
  const fp = generateFingerprint(chart);

  try {
    // 先用命宫主星预筛选候选（大幅减少比对量）
    const mingStar = fp.mingStars[0] ?? '';
    const gender = fp.gender;

    // 查询同性别+命宫主星相同的候选
    const result = await sql`
      SELECT id, fingerprint, interpretations, year
      FROM rag_samples
      WHERE gender = ${gender}
        AND fingerprint->>'mingStars' LIKE ${'%' + mingStar + '%'}
      LIMIT 500
    `.catch(() => []) as any[];

    const candidates = result as Array<{
      id: number;
      fingerprint: ChartFingerprint;
      interpretations: Record<string, string>;
      year: number;
    }>;

    if (candidates.length === 0) {
      return [];
    }

    // 精确计算相似度并排序
    const scored: RagResult[] = [];
    for (const row of candidates) {
      const candidateFp = row.fingerprint;
      const score = computeSimilarity(fp, candidateFp);

      if (score >= MIN_SCORE) {
        const interpretations = row.interpretations as Record<string, string>;
        scored.push({
          score,
          interpretations,
          summary: buildSummary(candidateFp, row.year),
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, TOP_K);
  } catch (e) {
    console.error('[rag:retrieve]', e instanceof Error ? e.message : e);
    return [];
  }
}

/** 构建命盘摘要 */
function buildSummary(fp: ChartFingerprint, year: number): string {
  const patterns = fp.patterns.length > 0 ? fp.patterns.join('、') : '无特殊格局';
  return `${year}年 · ${fp.gender === 'male' ? '男' : '女'} · 命宫${fp.mingStars.join('、')} · ${patterns}`;
}
