/**
 * POST /api/interpret
 *
 * AI 命盘解读（SSE 流式）
 * 接收 { chart, messages } → 构建倪海夏体系 system prompt → 调用 AI → SSE 流式返回
 *
 * 前端调用方：ChatPanel.tsx / InsightPanel.tsx
 */

import { NextRequest } from 'next/server';
import { createAIStream } from '@/lib/ai/client';
import { buildInterpretSystemPrompt } from '@/lib/ai/prompt';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { extractIP, trackAI } from '@/lib/tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 从用户消息中检测话题关键词 */
function detectTopic(content: string): string | undefined {
  const map: Record<string, string> = {
    '感情': 'love', '婚姻': 'love', '夫妻': 'love', '恋爱': 'love',
    '事业': 'career', '工作': 'career', '官禄': 'career', '职场': 'career',
    '财': 'wealth', '钱': 'wealth', '收入': 'wealth',
    '健康': 'health', '身体': 'health', '疾厄': 'health', '疾病': 'health',
    '性格': 'personality', '人格': 'personality',
  };
  for (const [key, topic] of Object.entries(map)) {
    if (content.includes(key)) return topic;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body: {
      chart: ZiweiChart;
      messages: Array<{ role: string; content: string }>;
    } = await request.json();

    if (!body.chart) {
      return new Response(JSON.stringify({ error: '缺少 chart' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 记录 AI 调用
    const ip = extractIP(request);
    trackAI(ip, 'interpret'); // fire-and-forget

    const basePrompt = buildInterpretSystemPrompt(body.chart);
    const messages = body.messages ?? [];

    // RAG 检索增强（超时 2s，失败静默降级）
    let systemPrompt = basePrompt;
    try {
      const { retrieveSimilarSamples } = await import('@/lib/rag/retrieve');
      const { enrichSystemPrompt } = await import('@/lib/rag/enrich');

      const ragResults = await Promise.race([
        retrieveSimilarSamples(body.chart),
        new Promise<null>(r => setTimeout(() => r(null), 2000)),
      ]);

      if (ragResults && ragResults.length > 0) {
        // 检测当前话题
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        const topic = lastUserMsg ? detectTopic(lastUserMsg.content) : undefined;
        systemPrompt = enrichSystemPrompt(basePrompt, ragResults, topic);
      }
    } catch (e) {
      console.error('[rag] 检索失败，降级为标准解读', e);
    }

    const stream = createAIStream(systemPrompt, messages);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '解读失败';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
