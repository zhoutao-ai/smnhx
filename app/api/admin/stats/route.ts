/**
 * GET /api/admin/stats
 *
 * 返回后台监控统计数据。
 * 需要 admin_token 验证。
 *
 * 查询参数：token — 管理密码
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminToken(): string {
  return process.env.ADMIN_TOKEN ?? 'ziwei-admin-2024';
}

function verifyToken(request: NextRequest): boolean {
  const token =
    request.nextUrl.searchParams.get('token') ??
    request.headers.get('x-admin-token') ??
    '';
  return token === getAdminToken();
}

export async function GET(request: NextRequest) {
  if (!verifyToken(request)) {
    return NextResponse.json({ error: '未授权：缺少或错误的 admin_token' }, { status: 401 });
  }

  try {
    // 并行查询所有统计数据
    const [
      todayVisitors,
      todayCharts,
      todayAICalls,
      yesterdayVisitors,
      yesterdayCharts,
      yesterdayAICalls,
      totalVisitors,
      totalCharts,
      totalAICalls,
      dailyStats,
      topIPs,
    ] = await Promise.all([
      // 今日访客数（IP 去重）
      sql`SELECT COUNT(*)::int AS count FROM visits WHERE date = CURRENT_DATE`,

      // 今日排盘次数
      sql`SELECT COUNT(*)::int AS count FROM chart_logs WHERE created_at::date = CURRENT_DATE`,

      // 今日 AI 调用次数
      sql`SELECT COUNT(*)::int AS count FROM ai_logs WHERE created_at::date = CURRENT_DATE`,

      // 昨日访客数
      sql`SELECT COUNT(*)::int AS count FROM visits WHERE date = CURRENT_DATE - INTERVAL '1 day'`,

      // 昨日排盘次数
      sql`SELECT COUNT(*)::int AS count FROM chart_logs WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day'`,

      // 昨日 AI 调用次数
      sql`SELECT COUNT(*)::int AS count FROM ai_logs WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day'`,

      // 累计独立访客
      sql`SELECT COUNT(DISTINCT ip)::int AS count FROM visits`,

      // 累计排盘
      sql`SELECT COUNT(*)::int AS count FROM chart_logs`,

      // 累计 AI 调用
      sql`SELECT COUNT(*)::int AS count FROM ai_logs`,

      // 最近 30 天每日统计
      sql`
        SELECT
          d.date::text AS date,
          COALESCE(v.visitors, 0)::int AS visitors,
          COALESCE(c.charts, 0)::int AS charts,
          COALESCE(a.ai_calls, 0)::int AS ai_calls
        FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') AS d(date)
        LEFT JOIN (
          SELECT date, COUNT(*)::int AS visitors FROM visits
          WHERE date >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY date
        ) v ON v.date = d.date
        LEFT JOIN (
          SELECT created_at::date AS date, COUNT(*)::int AS charts FROM chart_logs
          WHERE created_at::date >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY created_at::date
        ) c ON c.date = d.date
        LEFT JOIN (
          SELECT created_at::date AS date, COUNT(*)::int AS ai_calls FROM ai_logs
          WHERE created_at::date >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY created_at::date
        ) a ON a.date = d.date
        ORDER BY d.date DESC
      `,

      // 活跃 IP 排行（最近 30 天）
      sql`
        SELECT
          ip,
          charts,
          ai_calls,
          last_seen::text AS last_seen
        FROM (
          SELECT
            ip,
            (SELECT COUNT(*)::int FROM chart_logs WHERE chart_logs.ip = v.ip) AS charts,
            (SELECT COUNT(*)::int FROM ai_logs WHERE ai_logs.ip = v.ip) AS ai_calls,
            MAX(v.first_seen) AS last_seen
          FROM visits v
          WHERE v.date >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY v.ip
        ) sub
        ORDER BY charts + ai_calls DESC
        LIMIT 20
      `,
    ]);

    const extractCount = (rows: any): number => Number(rows?.[0]?.count ?? rows?.[0]?.count ?? 0);

    return NextResponse.json({
      today: {
        visitors: extractCount(todayVisitors),
        charts: extractCount(todayCharts),
        ai_calls: extractCount(todayAICalls),
      },
      yesterday: {
        visitors: extractCount(yesterdayVisitors),
        charts: extractCount(yesterdayCharts),
        ai_calls: extractCount(yesterdayAICalls),
      },
      total: {
        visitors: extractCount(totalVisitors),
        charts: extractCount(totalCharts),
        ai_calls: extractCount(totalAICalls),
      },
      daily_stats: dailyStats as Array<{
        date: string;
        visitors: number;
        charts: number;
        ai_calls: number;
      }>,
      top_ips: topIPs as Array<{
        ip: string;
        charts: number;
        ai_calls: number;
        last_seen: string;
      }>,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询统计失败';
    console.error('[admin:stats]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
