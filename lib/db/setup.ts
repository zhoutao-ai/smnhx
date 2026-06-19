import { sql } from './index';

export async function setupDatabase(): Promise<{ success: boolean; error?: string }> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        path TEXT NOT NULL DEFAULT '/',
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        visit_count INT NOT NULL DEFAULT 1
      )
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'visits_ip_date_key'
        ) THEN
          ALTER TABLE visits ADD CONSTRAINT visits_ip_date_key UNIQUE (ip, date);
        END IF;
      END $$
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS chart_logs (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'interpret',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        out_trade_no TEXT NOT NULL UNIQUE,
        trade_no TEXT,
        provider TEXT NOT NULL DEFAULT 'alipay',
        product_code TEXT NOT NULL DEFAULT 'ziwei_ai_unlock_lifetime',
        subject TEXT NOT NULL DEFAULT '紫微AI解读永久解锁',
        total_amount TEXT NOT NULL DEFAULT '2.00',
        currency TEXT NOT NULL DEFAULT 'CNY',
        status TEXT NOT NULL DEFAULT 'pending',
        buyer_id TEXT,
        buyer_logon_id TEXT,
        raw_notify JSONB,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'alipay'`;
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS product_code TEXT NOT NULL DEFAULT 'ziwei_ai_unlock_lifetime'`;
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '紫微AI解读永久解锁'`;
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CNY'`;
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS buyer_id TEXT`;
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS buyer_logon_id TEXT`;
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS raw_notify JSONB`;
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`;
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    await sql`
      CREATE TABLE IF NOT EXISTS rag_samples (
        id SERIAL PRIMARY KEY,
        gender TEXT NOT NULL,
        year INT NOT NULL,
        fingerprint JSONB NOT NULL,
        interpretations JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_visits_date ON visits (date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chart_logs_created_at ON chart_logs (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_ai_logs_type ON ai_logs (type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_samples_gender ON rag_samples (gender)`;

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '数据库初始化失败';
    console.error('[setupDatabase]', message);
    return { success: false, error: message };
  }
}
