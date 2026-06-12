/**
 * RAG 样本录入脚本 — 支持 .jsonl.gz 格式
 *
 * 从 51.8 万命盘样本数据中提取命盘指纹和解读文本，存入 rag_samples 表。
 *
 * 用法：
 *   # 从 ZIP 中的 .jsonl.gz 录入
 *   node --env-file .env.local --import tsx scripts/ingest-samples.ts <dir_or_zip>
 *
 *   # 控制录入数量（默认每文件取 1 条）
 *   SAMPLES_PER_FILE=5 node --env-file .env.local --import tsx scripts/ingest-samples.ts <dir>
 *
 *   # 仅解压 ZIP 不录入
 *   EXTRACT_ONLY=1 node --env-file .env.local --import tsx scripts/ingest-samples.ts <zip>
 */

import { readdirSync, readFileSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { createGunzip } from 'zlib';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { sql } from '../lib/db/index';
import { generateFingerprint } from '../lib/rag/fingerprint';
import type { ZiweiChart } from '../lib/ziwei/types';

const SAMPLES_PER_FILE = parseInt(process.env.SAMPLES_PER_FILE ?? '720', 10);
const BATCH_SIZE = 300;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 未设置');
  process.exit(1);
}

async function main() {
  const source = process.argv[2];
  if (!source) {
    console.error('用法: node --env-file .env.local --import tsx scripts/ingest-samples.ts <目录或ZIP文件>');
    process.exit(1);
  }

  // 如果是 ZIP，先解压
  let dir = source;
  if (source.endsWith('.zip')) {
    const extractDir = join(dirname(source), 'extracted');
    console.log(`📦 解压 ${basename(source)} → ${extractDir}`);
    if (!existsSync(extractDir)) mkdirSync(extractDir, { recursive: true });

    // 只解压 .jsonl.gz 文件
    execSync(`unzip -o "${source}" "*.jsonl.gz" -d "${extractDir}" 2>/dev/null || true`, { stdio: 'inherit' });
    dir = extractDir;

    if (process.env.EXTRACT_ONLY === '1') {
      console.log('✅ 解压完成');
      return;
    }
  }

  console.log(`📂 扫描: ${dir}`);
  const gzFiles = findFiles(dir, '.jsonl.gz');
  console.log(`   找到 ${gzFiles.length} 个 .jsonl.gz 文件`);
  console.log(`   每文件录入 ${SAMPLES_PER_FILE} 条\n`);

  let total = 0;
  const batch: Array<{ gender: string; year: number; fingerprint: any; interpretations: any }> = [];

  for (let fi = 0; fi < gzFiles.length; fi++) {
    const file = gzFiles[fi];
    try {
      let count = 0;
      const stream = createReadStream(file).pipe(createGunzip());
      const rl = createInterface({ input: stream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (count >= SAMPLES_PER_FILE) break;
        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);
          const chart: ZiweiChart = data.chart ?? data;
          const fingerprint = generateFingerprint(chart);
          const interpretations = data.topics ?? data.interpretations ?? {};

          batch.push({
            gender: chart.birthInfo.gender,
            year: chart.birthInfo.year,
            fingerprint,
            interpretations,
          });
          count++;
          total++;

          if (batch.length >= BATCH_SIZE) {
            await flushBatch(batch);
            batch.length = 0;
          }
        } catch { /* skip bad lines */ }
      }

      if ((fi + 1) % 100 === 0) {
        console.log(`   进度: ${fi + 1}/${gzFiles.length} 文件, 已录入 ${total} 条`);
      }
    } catch (e) {
      if (fi < 5) console.error(`   ⚠️  ${basename(file)}: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (batch.length > 0) await flushBatch(batch);

  console.log(`\n✅ 完成！录入 ${total} 条`);
}

async function flushBatch(
  batch: Array<{ gender: string; year: number; fingerprint: any; interpretations: any }>,
) {
  for (const item of batch) {
    await sql`
      INSERT INTO rag_samples (gender, year, fingerprint, interpretations)
      VALUES (${item.gender}, ${item.year}, ${JSON.stringify(item.fingerprint)}::jsonb, ${JSON.stringify(item.interpretations)}::jsonb)
      ON CONFLICT DO NOTHING
    `.catch(() => {});
  }
}

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  function walk(d: string) {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      try {
        if (statSync(full).isDirectory()) walk(full);
        else if (full.endsWith(ext)) results.push(full);
      } catch { /* skip */ }
    }
  }
  walk(dir);
  return results;
}

function dirname(p: string): string {
  return p.split(/[/\\]/).slice(0, -1).join('/') || '.';
}

main();
