/**
 * AI 客户端 — 支持 DeepSeek / OpenAI 兼容 / Anthropic
 *
 * 策略：优先使用 DeepSeek（国内访问快、便宜），
 *       其次检测 ANTHROPIC_API_KEY 走 Claude，
 *       最后回退到通用 OpenAI 兼容协议。
 */

// ─── 配置获取 ──────────────────────────────────────────────────
function getConfig() {
  const provider = process.env.AI_PROVIDER ?? 'deepseek';

  if (provider === 'deepseek' || process.env.DEEPSEEK_API_KEY) {
    return {
      apiKey: process.env.DEEPSEEK_API_KEY!,
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    };
  }

  if (provider === 'anthropic' || process.env.ANTHROPIC_API_KEY) {
    return {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      baseUrl: 'anthropic', // 特殊标记，走 Anthropic SDK
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6-20250514',
    };
  }

  // 通用 OpenAI 兼容（MIMO 等）
  return {
    apiKey: process.env.MIMO_API_KEY ?? '',
    baseUrl: process.env.MIMO_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.MIMO_MODEL ?? 'gpt-4o',
  };
}

// ─── Anthropic SDK 流式（内部） ─────────────────────────────────
async function* streamAnthropic(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const cfg = getConfig();
  const client = new Anthropic({ apiKey: cfg.apiKey });

  // Anthropic 只接受 user/assistant 角色
  const converted = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const stream = client.messages.stream({
    model: cfg.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: converted,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}

// ─── OpenAI 兼容流式（内部） ────────────────────────────────────
async function* streamOpenAICompat(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
) {
  const cfg = getConfig();

  const payload = {
    model: cfg.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  };

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err}`);
  }

  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // 最后一段可能不完整，留在 buffer 里
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // 跳过非 JSON 行
      }
    }
  }
}

// ─── 公开接口：返回 SSE 格式 ReadableStream ──────────────────────
export function createAIStream(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
): ReadableStream {
  const cfg = getConfig();

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream =
          cfg.baseUrl === 'anthropic'
            ? streamAnthropic(systemPrompt, messages)
            : streamOpenAICompat(systemPrompt, messages);

        for await (const textChunk of stream) {
          // 按前端期望的格式输出 SSE
          const payload = JSON.stringify({ delta: { text: textChunk } });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        const errMsg =
          e instanceof Error ? e.message : 'AI 服务异常，请稍后重试';
        const payload = JSON.stringify({
          delta: { text: `\n\n解读失败：${errMsg}` },
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}
