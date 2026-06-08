/**
 * System Prompt 构建器
 *
 * 从命盘数据 + 倪海夏体系知识库组装高质量的 AI 解读 system prompt。
 * 所有知识点均来自项目内开源材料：
 *   - constants.ts 的主星描述
 *   - patterns.ts 的格局知识
 *   - heming-knowledge.ts 的合盘方法论
 *   - 首页的倪海夏核心教义
 */

import type { ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES, STEMS, STAR_DESCRIPTIONS, PALACE_NAMES_ORDER } from '@/lib/ziwei/constants';
import { detectPatterns } from '@/lib/ziwei/patterns';

// ─── 工具函数 ─────────────────────────────────────────────────
function formatStars(chart: ZiweiChart): string {
  const lines: string[] = [];
  for (const palace of chart.palaces) {
    const stars = palace.stars
      .filter(s => s.type === 'major')
      .map(s => {
        const parts = [s.name];
        if (s.siHua) parts.push(`化${s.siHua}`);
        if (s.brightness === 'bright') parts.push('(庙旺)');
        if (s.brightness === 'dim') parts.push('(落陷)');
        return parts.join('');
      });

    const sha = palace.stars
      .filter(s => s.type === 'sha')
      .map(s => s.name);

    const lucky = palace.stars
      .filter(s => s.type === 'lucky')
      .map(s => s.name);

    const markers: string[] = [];
    if (palace.isMingGong) markers.push('★命宫');
    if (palace.isShenGong) markers.push('◎身宫');
    if (palace.isCurrentDaXian) markers.push('◈当前大限');

    const starStr = stars.length > 0 ? stars.join('、') : '空宫(借对宫)';
    const detail: string[] = [starStr];
    if (sha.length > 0) detail.push(`煞:${sha.join('、')}`);
    if (lucky.length > 0) detail.push(`吉:${lucky.join('、')}`);

    const marker = markers.length > 0 ? ` ${markers.join(' ')}` : '';
    const branchName = BRANCHES[palace.branch];
    const stemName = STEMS[palace.stem];
    lines.push(
      `  ${palace.name}(${branchName}${stemName}): ${detail.join(' | ')}${marker}`,
    );
  }
  return lines.join('\n');
}

function formatDaxian(chart: ZiweiChart): string {
  return chart.daXians
    .map(dx => {
      const cur = chart.currentDaXianIndex >= 0 &&
        chart.daXians[chart.currentDaXianIndex]?.startAge === dx.startAge
        ? ' ◀ 当前'
        : '';
      return `  ${dx.startAge}-${dx.endAge}岁 → ${dx.palaceName}${cur}`;
    })
    .join('\n');
}

function buildCoreTeachings(): string {
  return `
## 倪海夏核心教义（必须遵循）

1. **命宫为本，三方为用**：看命必先看命宫。命宫主星决定基本格局与性格，三方（财帛、官禄、迁移）决定"用武之地"。四宫联动才是完整人生图景。

2. **对宫借星，不可忽视**：空宫必须借对宫星曜论断。命宫对面是迁移宫，两者互相影响。

3. **四化才是命运的手**：星曜是基础，四化（化禄、化权、化科、化忌）才是决定运势好坏的关键。同一颗星，有化禄与有化忌，人生轨迹截然不同。"不看四化，命盘只解了一半。"

4. **大限十年，运势有节**：人生分12个大限，每限10年。不同大限宫位际遇完全不同。了解现在走哪个大限、该宫有何星曜，才能真正把握当下运势。

5. **南派三合派立场**：不搞飞星派复杂的四化飞来飞去，"毕竟大道至简"。以命宫为本、三方四正为用、四化为纲。
`;
}

// ─── 公开接口 ─────────────────────────────────────────────────

/** 为 /api/interpret 构建 system prompt */
export function buildInterpretSystemPrompt(chart: ZiweiChart): string {
  const mingGong = chart.palaces.find(p => p.isMingGong);
  const mingStars = mingGong?.stars.filter(s => s.type === 'major') ?? [];
  const mingStarNames = mingStars.map(s => s.name);

  // 命宫主星描述
  const starDescriptions = mingStars
    .map(s => {
      const desc = STAR_DESCRIPTIONS[s.name];
      if (!desc) return '';
      return `${s.name}：${desc.keywords}，${desc.nature}，属${desc.element}`;
    })
    .filter(Boolean)
    .join('；');

  // 格局识别
  const patterns = detectPatterns(chart);
  const patternText =
    patterns.length > 0
      ? patterns
          .map(
            p =>
              `- ${p.name}（${p.level === 'excellent' ? '上格' : p.level === 'good' ? '吉格' : p.level === 'caution' ? '注意' : '中平'}）：${p.description}`,
          )
          .join('\n')
      : '（未命中经典格局）';

  // 当前大限
  let currentDxText = '';
  if (chart.currentDaXianIndex >= 0) {
    const dx = chart.daXians[chart.currentDaXianIndex];
    const dxPalace = chart.palaces.find(p => p.branch === dx.palaceBranch);
    const dxStars = dxPalace?.stars.filter(s => s.type === 'major') ?? [];
    const dxStarNames = dxStars.map(s => `${s.name}${s.siHua ? '化' + s.siHua : ''}`).join('、');
    currentDxText = `当前走【${dx.palaceName}】大限（${dx.startAge}-${dx.endAge}岁），该宫主星：${dxStarNames || '空宫'}`;
  }

  return `你是紫微斗数命理师，严格遵循倪海夏《天纪》三合派体系进行命盘解读。

${buildCoreTeachings()}

## 本命盘信息

- 出生：${chart.birthInfo.year}年${chart.birthInfo.month}月${chart.birthInfo.day}日 ${BRANCHES[chart.birthInfo.hour]}时 · ${chart.birthInfo.gender === 'male' ? '男' : '女'}
- 农历：${chart.lunarInfo.lunarYear}年${chart.lunarInfo.isLeapMonth ? '闰' : ''}${chart.lunarInfo.lunarMonth}月${chart.lunarInfo.lunarDay}日
- 命宫在${BRANCHES[chart.mingGongBranch]} · 身宫在${BRANCHES[chart.shenGongBranch]} · ${chart.wuxingJuName}
- 命宫主星：${mingStarNames.join('、') || '空宫'}
- 主星特质：${starDescriptions || '无'}

## 十二宫详情

${formatStars(chart)}

## 识别的格局

${patternText}

## 大限走势

${formatDaxian(chart)}

${currentDxText}

## 解读要求

1. 引用倪海夏在《天纪》中的原话或观点时，请明确标注"倪师说"
2. 区分"本命（先天）""大限（十年运）""流年（当年运）"三个时间维度
3. 用百姓能懂的语言，不要堆砌术语
4. 保持积极建设性，不吓人、不宿命论
5. 格式：用 **【标题】** 作为分段标记
6. 对空宫情况，主动引用对宫借星分析
7. 最后给出具体可操作的建议`;
}

/** 为 /api/heming 构建 system prompt */
export function buildHemingSystemPrompt(
  chartA: ZiweiChart,
  chartB: ZiweiChart,
): string {
  const mingA = chartA.palaces.find(p => p.isMingGong);
  const mingB = chartB.palaces.find(p => p.isMingGong);
  const fuqiA = chartA.palaces.find(p => p.name === '夫妻宫');
  const fuqiB = chartB.palaces.find(p => p.name === '夫妻宫');
  const fudeA = chartA.palaces.find(p => p.name === '福德宫');
  const fudeB = chartB.palaces.find(p => p.name === '福德宫');

  const getMajors = (p: typeof mingA) =>
    p?.stars.filter(s => s.type === 'major').map(s => s.name).join('、') ?? '';

  return `你是紫微斗数合盘分析师，严格遵循倪海夏《天纪》体系。

## 倪师合盘核心原则

**"看婚姻，光看夫妻宫，大错特错，一定要同时看福德宫。"**

合盘时必须同时分析双方的：命宫 + 夫妻宫 + 福德宫。

## 甲方命盘

- 出生：${chartA.birthInfo.year}年${chartA.birthInfo.month}月${chartA.birthInfo.day}日 ${BRANCHES[chartA.birthInfo.hour]}时 · ${chartA.birthInfo.gender === 'male' ? '男' : '女'}
- 命宫主星：${getMajors(mingA)} · ${chartA.wuxingJuName}
- 夫妻宫主星：${getMajors(fuqiA)}
- 福德宫主星：${getMajors(fudeA)}

${formatStars(chartA)}

## 乙方命盘

- 出生：${chartB.birthInfo.year}年${chartB.birthInfo.month}月${chartB.birthInfo.day}日 ${BRANCHES[chartB.birthInfo.hour]}时 · ${chartB.birthInfo.gender === 'male' ? '男' : '女'}
- 命宫主星：${getMajors(mingB)} · ${chartB.wuxingJuName}
- 夫妻宫主星：${getMajors(fuqiB)}
- 福德宫主星：${getMajors(fudeB)}

${formatStars(chartB)}

## 解读要求

1. 先分析双方各自命格基础（性格、格局）
2. 再分析夫妻宫互参：双方夫妻宫主星与对方命宫主星的对应关系
3. 如果用户问了特定问题（感情/合伙/亲子等），聚焦回答该问题
4. 最后给出缘分类型判断和具体建议
5. 引用倪海夏原话时标注"倪师说"
6. 用百姓能懂的语言，保持积极建设性
7. 格式：用 **【标题】** 作为分段标记`;
}
