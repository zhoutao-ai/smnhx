/**
 * 数据库初始化脚本
 *
 * 用法：node --env-file .env.local --import tsx scripts/init-db.ts
 *
 * 创建 visits / chart_logs / ai_logs 三张表。
 */

import { setupDatabase } from '../lib/db/setup';

async function main() {
  console.log('🔧 初始化数据库表...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 未设置，请确保 .env.local 文件存在');
    process.exit(1);
  }

  console.log(`   数据库: ${process.env.DATABASE_URL.slice(0, 50)}...\n`);

  const result = await setupDatabase();

  if (result.success) {
    console.log('✅ 数据库表创建成功！');
    console.log('');
    console.log('已创建以下表：');
    console.log('  - visits       每日访问记录（IP + 日期去重）');
    console.log('  - chart_logs   排盘记录');
    console.log('  - ai_logs      AI 调用记录');
  } else {
    console.error('❌ 初始化失败:', result.error);
    process.exit(1);
  }
}

main();
