/**
 * POST /api/track/visit
 *
 * 记录页面访问（middleware 触发，fire-and-forget）。
 * 从请求头提取 IP，写入 visits 表（IP + 日期唯一）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractIP, trackVisit } from '@/lib/tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ip = extractIP(request);
    const path = request.nextUrl.searchParams.get('path') ?? '/';

    await trackVisit(ip, path);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '追踪失败';
    console.error('[track:visit]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
