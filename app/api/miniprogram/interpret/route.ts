import { NextRequest, NextResponse } from 'next/server';
import { createAIStream } from '@/lib/ai/client';
import { buildInterpretSystemPrompt } from '@/lib/ai/prompt';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { extractIP, trackAI } from '@/lib/tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function collectSseText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;
      try {
        text += JSON.parse(data).delta?.text ?? '';
      } catch {
        // Ignore malformed stream chunks.
      }
    }
  }

  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body: {
      chart?: ZiweiChart;
      messages?: Array<{ role: string; content: string }>;
    } = await request.json();

    if (!body.chart) {
      return NextResponse.json({ error: '缺少 chart' }, { status: 400 });
    }

    const messages = body.messages ?? [];
    const systemPrompt = buildInterpretSystemPrompt(body.chart);
    const ip = extractIP(request);
    trackAI(ip, 'interpret');

    const stream = createAIStream(systemPrompt, messages);
    const text = await collectSseText(stream);

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : '解读失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
