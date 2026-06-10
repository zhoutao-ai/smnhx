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

// ─── Mock AI（本地测试用，无需任何 API Key）────────────────────
const MOCK_RESPONSES: Record<string, string> = {
  overview: `**【命格定性】**
此命盘命宫主星格局清晰，整体气质偏内敛沉稳，为人处世有章法，不喜浮夸。

**【主星解读】**
倪海夏老师指出：命宫主星决定一个人的基本格局与天生性格。此命盘主星坐命宫，三方四正配合得当，属中上之格。

**【三方四正】**
财帛宫、官禄宫、迁移宫三方联动良好。财官二宫得吉星照耀，事业财运皆有发展空间；迁移宫有辅星加持，外出机遇不错。

**【当前大限】**
当前大限运势平稳上升，宜稳扎稳打，不宜冒进。此十年重在积累实力，为下一阶段打好基础。

**【优势与注意】**
命盘天赋在于思维清晰、处事稳健。需要注意的是偶尔过于谨慎，可能错失良机。建议在关键时刻敢于决断。`,

  love: `**【感情格局】**
此命盘夫妻宫配置不差，感情运势整体属于中等偏上。

**【夫妻宫分析】**
夫妻宫无煞星冲破，主星入庙，表示婚姻对象条件不错。倪师认为夫妻宫好，另一半自然不会是太差的人。

**【三方联动】**
福德宫与迁移宫对夫妻宫形成良性互动，感情中能得贵人牵线，外出也易遇到缘分。

**【当前大限感情运】**
当下大限走夫妻宫三合方，是感情发展的重要阶段，适合主动拓展社交圈。

**【实际建议】**
多参与社交活动，顺其自然不强求。已婚者注意沟通方式，多体谅对方。`,

  career: `**【事业格局】**
官禄宫星曜配置有力，事业格局不错，适合走专业路线。

**【官禄宫分析】**
官禄宫主星入度良好，有辅弼星相助，主工作中能得同事支持。倪师言：官禄宫好，事业不愁。

**【财帛宫联动】**
财帛宫与官禄宫呼应，收入来源稳定，适合长期深耕一个领域，不宜频繁跳槽。

**【当前大限事业运】**
此大限事业运势向上，有升职或转型机会。把握当下时机，积极展示能力。

**【实际建议】**
适合深耕专业技能，技术型、管理型岗位均可。创业者宜守不宜攻，先巩固现有基础。`,

  wealth: `**【财运格局】**
财帛宫配置中上，财运以正财为主，偏财运一般。

**【财帛宫分析】**
财帛宫主星稳健，收入模式以主动收入为主。倪师指出：财帛宫主星决定财富来源方式，此盘适合靠专业能力赚钱。

**【田宅宫（财库）】**
田宅宫有吉星照守，不动产运势不错，有积累家业的能力。积蓄方面需注意规划。

**【当前大限财运】**
当下财运处于积累期，不宜高风险投资。守住主业收入，逐步拓展副业是稳妥之道。

**【理财建议】**
建立长期储蓄计划，不动产可考虑，股票等高风险投资需谨慎。`,

  health: `**【疾厄宫主星】**
疾厄宫无大凶星冲破，先天体质尚可。

**【主要风险】**
结合倪海夏子午流注理论，需要注意肝胆系统和肠胃方面。作息不规律时容易出现问题，建议定期体检。

**【大限健康走势】**
当前大限健康无明显大碍，但需注意劳逸结合，避免过度疲劳积累成疾。

**【预防建议】**
保持规律作息，饮食清淡，适量运动。每年体检一次，重点关注肝胆和消化系统。`,

  personality: `**【命宫主星性格】**
命宫主星气质使然，天生带有一种沉稳与内敛。倪师曾言：看命先看命宫，命宫主星决定性格底色。

**【三方性格综合】**
财帛宫主务实、官禄宫主进取、迁移宫主开放——三宫综合下来，是一个内外兼修的性格类型。对外沉稳，对内有自己的坚持。

**【人际关系模式】**
与人交往温和有礼，不喜冲突。朋友不多但质量高，属于重质不重量的社交风格。

**【优势与人生课题】**
优势在于踏实可靠、思维清晰。人生课题是学会适当放松，不要给自己太大压力，偶尔随性而为也是智慧。`,
};

function pickMockTopic(messages: Array<{ role: string; content: string }>): string {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUser) return MOCK_RESPONSES.overview;
  const text = lastUser.content;
  if (text.includes('感情') || text.includes('婚姻') || text.includes('夫妻')) return MOCK_RESPONSES.love;
  if (text.includes('事业') || text.includes('工作') || text.includes('官禄')) return MOCK_RESPONSES.career;
  if (text.includes('财') || text.includes('钱')) return MOCK_RESPONSES.wealth;
  if (text.includes('健康') || text.includes('身体') || text.includes('疾厄')) return MOCK_RESPONSES.health;
  if (text.includes('性格') || text.includes('人格')) return MOCK_RESPONSES.personality;
  return MOCK_RESPONSES.overview;
}

async function* mockAIStream(
  _systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
) {
  const full = pickMockTopic(messages);
  // 模拟流式输出：逐字吐出，每 20ms 一个字符
  for (const char of full) {
    yield char;
    await new Promise(r => setTimeout(r, 18 + Math.random() * 24));
  }
}

// ─── 公开接口：返回 SSE 格式 ReadableStream ──────────────────────
export function createAIStream(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
): ReadableStream {
  const encoder = new TextEncoder();

  // Mock 模式：本地测试无需任何 API Key
  if (process.env.MOCK_AI === 'true') {
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const char of mockAIStream(systemPrompt, messages)) {
            const payload = JSON.stringify({ delta: { text: char } });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : 'Mock AI 异常';
          const payload = JSON.stringify({ delta: { text: `\n\n解读失败：${errMsg}` } });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });
  }

  const cfg = getConfig();

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
