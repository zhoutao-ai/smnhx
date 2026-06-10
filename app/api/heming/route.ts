/**
 * POST /api/heming
 *
 * AI 合盘分析（SSE 流式）
 * 接收 { chartA, chartB, question? } → 构建合盘 system prompt → 调用 AI → SSE 流式返回
 *
 * 前端调用方：heming/page.tsx
 */

import { NextRequest } from 'next/server';
import { createAIStream } from '@/lib/ai/client';
import { buildHemingSystemPrompt } from '@/lib/ai/prompt';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { extractIP, trackAI } from '@/lib/tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: {
      chartA: ZiweiChart;
      chartB: ZiweiChart;
      question?: string;
    } = await request.json();

    if (!body.chartA || !body.chartB) {
      return new Response(JSON.stringify({ error: '缺少 chartA 或 chartB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 记录 AI 调用（合盘）
    const ip = extractIP(request);
    trackAI(ip, 'heming'); // fire-and-forget

    const systemPrompt = buildHemingSystemPrompt(body.chartA, body.chartB);

    // 构建消息列表
    const messages: Array<{ role: string; content: string }> = [];

    if (body.question) {
      messages.push({ role: 'user', content: body.question });
    } else {
      messages.push({
        role: 'user',
        content:
          '请对这两个命盘进行完整的合盘分析，包括：双方命格匹配度、感情缘分类型、相处注意事项，以及具体建议。',
      });
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
    const message = e instanceof Error ? e.message : '合盘分析失败';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
