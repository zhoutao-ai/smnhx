/**
 * 数据库连接模块 — 使用 @neondatabase/serverless
 *
 * 提供 sql 模板函数用于执行 SQL 查询。
 * 适用于 API Route（Node.js Runtime）。
 */
import { neon } from '@neondatabase/serverless';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL 未配置');
  }
  return url;
}

let _sql: ReturnType<typeof neon> | null = null;

/** SQL 查询函数（自动参数化） */
export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!_sql) {
    _sql = neon(getDatabaseUrl());
  }
  return _sql(strings, ...values);
}
