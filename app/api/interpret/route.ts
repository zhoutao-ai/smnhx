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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const systemPrompt = buildInterpretSystemPrompt(body.chart);
    const messages = body.messages ?? [];

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
