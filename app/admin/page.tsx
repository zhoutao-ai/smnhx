'use client';

import { useEffect, useState, useCallback } from 'react';

// ─── 类型 ──────────────────────────────────────────────────
interface TodayStats {
  visitors: number;
  charts: number;
  ai_calls: number;
}

interface DailyStat {
  date: string;
  visitors: number;
  charts: number;
  ai_calls: number;
}

interface TopIP {
  ip: string;
  charts: number;
  ai_calls: number;
  last_seen: string;
}

interface StatsData {
  today: TodayStats;
  yesterday: TodayStats;
  total: TodayStats;
  daily_stats: DailyStat[];
  top_ips: TopIP[];
}

// ─── 密码存储 key ─────────────────────────────────────────
const TOKEN_KEY = 'ziwei_admin_token';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}33`,
        borderRadius: '12px',
        padding: '20px 24px',
        textAlign: 'center',
        minWidth: '140px',
      }}
    >
      <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#8899aa', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '36px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState('');
  const [inputToken, setInputToken] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 检查 sessionStorage 中的 token
  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
      setAuthorized(true);
    }
  }, []);

  const fetchStats = useCallback(async (authToken: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/stats?token=${encodeURIComponent(authToken)}`);
      if (res.status === 401) {
        setAuthorized(false);
        setToken('');
        sessionStorage.removeItem(TOKEN_KEY);
        setError('密码错误或已过期，请重新输入');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const json: StatsData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 授权后拉取数据
  useEffect(() => {
    if (!authorized || !token) return;
    fetchStats(token);

    // 每 30 秒自动刷新
    const interval = setInterval(() => fetchStats(token), 30_000);
    return () => clearInterval(interval);
  }, [authorized, token, fetchStats]);

  const handleLogin = () => {
    if (!inputToken.trim()) return;
    sessionStorage.setItem(TOKEN_KEY, inputToken.trim());
    setToken(inputToken.trim());
    setAuthorized(true);
  };

  // ── 登录界面 ─────────────────────────────────────────────
  if (!authorized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0e14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '40px 36px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#e0e8f0', marginBottom: '6px', letterSpacing: '0.1em' }}>
            后台管理
          </h1>
          <p style={{ fontSize: '12px', color: '#667788', marginBottom: '24px' }}>
            请输入管理密码以查看监控数据
          </p>
          <input
            type="password"
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
            placeholder="管理密码"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: '#e0e8f0',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            进入后台
          </button>
          {error && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#f87171' }}>{error}</div>
          )}
        </div>
      </div>
    );
  }

  // ── 仪表盘界面 ───────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0e14',
        color: '#e0e8f0',
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        padding: '32px 24px',
      }}
    >
      {/* 顶栏 */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
          maxWidth: '1200px',
          margin: '0 auto 32px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '0.1em', margin: 0 }}>
            📊 紫微命盘 · 后台监控
          </h1>
          <p style={{ fontSize: '11px', color: '#556677', margin: '4px 0 0', letterSpacing: '0.05em' }}>
            数据实时更新 · 每 30 秒自动刷新
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => fetchStats(token)}
            disabled={loading}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: loading ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
              color: '#8899aa',
              fontSize: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '刷新中…' : '🔄 手动刷新'}
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem(TOKEN_KEY);
              setAuthorized(false);
              setToken('');
              setData(null);
            }}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid rgba(255,100,100,0.2)',
              background: 'rgba(255,100,100,0.06)',
              color: '#cc7777',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            退出
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,100,100,0.2)',
              background: 'rgba(255,100,100,0.06)',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {!data && loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#556677' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
            加载中…
          </div>
        )}

        {!data && !loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#556677' }}>
            暂无数据
          </div>
        )}

        {data && (
          <>
            {/* ═══ 今日概览 + 昨日概览 ═══════════════════════ */}
            <section style={{ marginBottom: '36px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 今日 */}
                <div>
                  <h2 style={{ fontSize: '13px', letterSpacing: '0.15em', color: '#667788', marginBottom: '16px', textTransform: 'uppercase' }}>
                    📅 今日概览
                  </h2>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <StatCard label="独立访客" value={data.today.visitors} color="#60a5fa" />
                    <StatCard label="排盘次数" value={data.today.charts} color="#fbbf24" />
                    <StatCard label="AI 调用" value={data.today.ai_calls} color="#34d399" />
                  </div>
                </div>
                {/* 昨日 */}
                <div>
                  <h2 style={{ fontSize: '13px', letterSpacing: '0.15em', color: '#667788', marginBottom: '16px', textTransform: 'uppercase' }}>
                    📆 昨日概览
                  </h2>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <StatCard label="独立访客" value={data.yesterday.visitors} color="#818cf8" />
                    <StatCard label="排盘次数" value={data.yesterday.charts} color="#f59e0b" />
                    <StatCard label="AI 调用" value={data.yesterday.ai_calls} color="#10b981" />
                  </div>
                </div>
              </div>
            </section>

            {/* ═══ 累计统计 ═══════════════════════════════════ */}
            <section style={{ marginBottom: '36px' }}>
              <h2 style={{ fontSize: '13px', letterSpacing: '0.15em', color: '#667788', marginBottom: '16px', textTransform: 'uppercase' }}>
                📈 累计统计
              </h2>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <StatCard label="总独立访客" value={data.total.visitors} color="#818cf8" />
                <StatCard label="总排盘数" value={data.total.charts} color="#f59e0b" />
                <StatCard label="总 AI 调用" value={data.total.ai_calls} color="#10b981" />
              </div>
            </section>

            {/* ═══ 每日趋势 ═══════════════════════════════════ */}
            <section style={{ marginBottom: '36px' }}>
              <h2 style={{ fontSize: '13px', letterSpacing: '0.15em', color: '#667788', marginBottom: '16px', textTransform: 'uppercase' }}>
                📉 近 30 天趋势
              </h2>
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  overflow: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#556677', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em' }}>日期</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#556677', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em' }}>访客</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#556677', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em' }}>排盘</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#556677', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em' }}>AI 调用</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily_stats.map(row => {
                      const isToday = row.date === new Date().toISOString().slice(0, 10);
                      return (
                        <tr
                          key={row.date}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            background: isToday ? 'rgba(59,130,246,0.04)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '8px 16px', color: isToday ? '#93c5fd' : '#8899aa' }}>
                            {row.date}
                            {isToday && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#3b82f6' }}>今天</span>}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#bcc8d8' }}>
                            {row.visitors.toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#bcc8d8' }}>
                            {row.charts.toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#bcc8d8' }}>
                            {row.ai_calls.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ═══ 活跃 IP 排行 ══════════════════════════════ */}
            <section>
              <h2 style={{ fontSize: '13px', letterSpacing: '0.15em', color: '#667788', marginBottom: '16px', textTransform: 'uppercase' }}>
                👥 活跃 IP 排行（近 30 天）
              </h2>
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  overflow: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#556677', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em' }}>#</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#556677', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em' }}>IP 地址</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#556677', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em' }}>排盘次数</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#556677', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em' }}>AI 调用</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#556677', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em' }}>最近活跃</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_ips.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#556677' }}>
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      data.top_ips.map((row, i) => (
                        <tr
                          key={row.ip}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        >
                          <td style={{ padding: '8px 16px', color: '#667788', fontVariantNumeric: 'tabular-nums' }}>
                            {i + 1}
                          </td>
                          <td style={{ padding: '8px 16px', color: '#8899aa', fontFamily: 'monospace', fontSize: '12px' }}>
                            {row.ip}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#fbbf24' }}>
                            {row.charts.toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#34d399' }}>
                            {row.ai_calls.toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', color: '#667788', fontSize: '12px' }}>
                            {row.last_seen ? new Date(row.last_seen).toLocaleString('zh-CN', { hour12: false }) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
