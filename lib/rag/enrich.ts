/**
 * RAG Prompt 增强
 *
 * 将检索到的相似命盘解读作为 few-shot 参考注入 system prompt。
 */

import type { RagResult } from './types';

/**
 * 将 RAG 检索结果拼入 system prompt。
 * 放在「解读要求」之前，给 AI 提供真实案例参考。
 */
export function enrichSystemPrompt(
  basePrompt: string,
  ragResults: RagResult[],
  topic?: string,
): string {
  if (ragResults.length === 0) return basePrompt;

  const examples = ragResults.map((r, i) => {
    const topicText = topic && r.interpretations[topic]
      ? `\n【${topic}】${r.interpretations[topic].slice(0, 250)}`
      : r.interpretations.overview?.slice(0, 200) ?? '';

    return `### 参考案例 ${i + 1}（相似度 ${(r.score * 100).toFixed(0)}%）
**命盘**：${r.summary}
**解读摘录**：${topicText || '（无对应文本）'}`;
  }).join('\n\n');

  return `${basePrompt}

## 倪海夏体系真实案例参考

以下是本知识库中与当前命盘最相似的 ${ragResults.length} 个真实案例及其解读。请参考这些案例的行文风格、术语使用和分析深度来回答，但要根据当前命盘的实际数据进行调整：

${examples}

**重要**：以上案例仅供参考风格和深度，解读必须严格基于当前命盘的实际数据，不要照搬案例内容。`;
}
