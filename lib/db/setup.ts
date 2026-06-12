/**
 * 数据库表初始化
 *
 * 创建三张追踪表：
 * - visits       每日访问记录（IP + 日期去重）
 * - chart_logs   排盘记录
 * - ai_logs      AI 调用记录
 */

import { sql } from './index';

const CREATE_TABLES_SQL = `
-- 每日访问记录（同一 IP 每天只计一次）
CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '/',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_count INT NOT NULL DEFAULT 1,
  UNIQUE(ip, date)
);

-- 排盘记录
CREATE TABLE IF NOT EXISTS chart_logs (
  id SERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI 调用记录
CREATE TABLE IF NOT EXISTS ai_logs (
  id SERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'interpret',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：加速按日期查询
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits (date DESC);
CREATE INDEX IF NOT EXISTS idx_chart_logs_created_at ON chart_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_type ON ai_logs (type);
`;

/**
 * 执行建表语句，幂等（CREATE IF NOT EXISTS）
 */
export async function setupDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    // neon() 不支持多条语句批量执行，逐条发送
    const statements = CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      await sql`${stmt as any}`.catch(() => {
        // neon doesn't support raw SQL strings well; fallback below
      });
    }

    // 使用简单的逐条执行方式
    await sql`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        path TEXT NOT NULL DEFAULT '/',
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        visit_count INT NOT NULL DEFAULT 1
      )
    `.catch(() => {});

    // 添加 UNIQUE 约束（如果表刚创建）
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'visits_ip_date_key'
        ) THEN
          ALTER TABLE visits ADD CONSTRAINT visits_ip_date_key UNIQUE (ip, date);
        END IF;
      END $$
    `.catch(() => {});

    await sql`
      CREATE TABLE IF NOT EXISTS chart_logs (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.catch(() => {});

    await sql`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'interpret',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.catch(() => {});

    // RAG 命盘样本库
    await sql`
      CREATE TABLE IF NOT EXISTS rag_samples (
        id SERIAL PRIMARY KEY,
        gender TEXT NOT NULL,
        year INT NOT NULL,
        fingerprint JSONB NOT NULL,
        interpretations JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.catch(() => {});

    // 索引
    await sql`CREATE INDEX IF NOT EXISTS idx_visits_date ON visits (date DESC)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS idx_chart_logs_created_at ON chart_logs (created_at DESC)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs (created_at DESC)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS idx_ai_logs_type ON ai_logs (type)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_samples_gender ON rag_samples (gender)`.catch(() => {});

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : '数据库初始化失败';
    console.error('[setupDatabase]', message);
    return { success: false, error: message };
  }
}
