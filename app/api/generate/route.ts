/**
 * POST /api/generate
 *
 * 接收 BirthInfo，调用 generateChart() 排盘，返回 ZiweiChart JSON。
 * 前端 chart/page.tsx 和 heming/page.tsx 通过此接口起盘。
 */

import { NextResponse } from 'next/server';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo } from '@/lib/ziwei/types';
import { extractIP, trackChart } from '@/lib/tracker';

export async function POST(request: Request) {
  try {
    const body: BirthInfo = await request.json();

    if (!body.year || !body.month || !body.day || body.hour === undefined || !body.gender) {
      return NextResponse.json(
        { error: '缺少必填字段：year, month, day, hour, gender' },
        { status: 400 },
      );
    }

    const chart = generateChart(body);

    // 记录排盘
    const ip = extractIP(request);
    trackChart(ip); // fire-and-forget

    return NextResponse.json(chart);
  } catch (e) {
    const message = e instanceof Error ? e.message : '命盘生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
