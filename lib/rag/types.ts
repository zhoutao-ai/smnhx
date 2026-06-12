/**
 * RAG 检索增强类型定义
 *
 * 每条命盘样本包含：指纹（用于相似度匹配）+ 各主题解读文本
 */

export interface ChartFingerprint {
  /** 命宫主星名称 */
  mingStars: string[];
  /** 命宫地支 */
  mingBranch: number;
  /** 身宫地支 */
  shenBranch: number;
  /** 五行局 */
  wuxingJu: number;
  /** 各宫主星分布: palace_branch → [star_names] */
  starMap: Record<string, string[]>;
  /** 四化星: starName → sihuaType */
  sihuaMap: Record<string, string>;
  /** 命中的格局名称 */
  patterns: string[];
  /** 性别 */
  gender: 'male' | 'female';
  /** 出生年天干 */
  yearStem: number;
}

export interface SampleRecord {
  id: number;
  /** 命盘指纹（JSONB） */
  fingerprint: ChartFingerprint;
  /** 解读文本（JSONB）: topic → text */
  interpretations: Record<string, string>;
  /** 出生年份 */
  year: number;
  /** 性别 */
  gender: string;
}

export interface RagResult {
  /** 相似度分数 (0-1) */
  score: number;
  /** 匹配的解读文本 */
  interpretations: Record<string, string>;
  /** 匹配的命盘摘要 */
  summary: string;
}
