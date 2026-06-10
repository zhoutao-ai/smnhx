/**
 * 追踪工具模块
 *
 * 提供三个 fire-and-forget 追踪函数：
 * - trackVisit()   记录页面访问（每日 IP 去重）
 * - trackChart()   记录排盘次数
 * - trackAI()      记录 AI 调用次数
 *
 * 所有函数静默失败，不影响主业务流程。
 */

import { sql } from '@/lib/db/index';

/** 从请求头提取客户端 IP */
export function extractIP(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

/** 记录页面访问 */
export async function trackVisit(ip: string, path: string): Promise<void> {
  try {
    await sql`
      INSERT INTO visits (ip, path, date)
      VALUES (${ip}, ${path}, CURRENT_DATE)
      ON CONFLICT (ip, date) DO UPDATE SET
        visit_count = visits.visit_count + 1
    `;
  } catch (e) {
    // 静默失败
    console.error('[tracker:visit]', e instanceof Error ? e.message : e);
  }
}

/** 记录排盘 */
export async function trackChart(ip: string): Promise<void> {
  try {
    await sql`
      INSERT INTO chart_logs (ip) VALUES (${ip})
    `;
  } catch (e) {
    console.error('[tracker:chart]', e instanceof Error ? e.message : e);
  }
}

/** 记录 AI 调用 */
export async function trackAI(ip: string, type: 'interpret' | 'heming'): Promise<void> {
  try {
    await sql`
      INSERT INTO ai_logs (ip, type) VALUES (${ip}, ${type})
    `;
  } catch (e) {
    console.error('[tracker:ai]', e instanceof Error ? e.message : e);
  }
}
