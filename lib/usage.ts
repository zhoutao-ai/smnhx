'use client';

const FREE_LIMIT = 1; // 免费 AI 解读次数上限
const USAGE_COUNT_KEY = 'ziwei_ai_usage_count';
const UNLOCKED_KEY = 'ziwei_ai_unlocked';

// sessionStorage：关闭标签页才重置，刷新页面不会重置
function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch { /* skip */ }
}

/** 获取当前已使用次数 */
export function getUsageCount(): number {
  const raw = safeGet(USAGE_COUNT_KEY);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

/** 增加一次使用记录 */
export function incrementUsage(): number {
  const next = getUsageCount() + 1;
  safeSet(USAGE_COUNT_KEY, String(next));
  return next;
}

/** 是否已永久解锁 */
export function isUnlocked(): boolean {
  return safeGet(UNLOCKED_KEY) === 'true';
}

/** 设置永久解锁状态 */
export function setUnlocked(value: boolean): void {
  safeSet(UNLOCKED_KEY, String(value));
}

/** 剩余免费次数 */
export function remainingFree(): number {
  return Math.max(0, FREE_LIMIT - getUsageCount());
}

/** 是否已达到免费上限（且未解锁） */
export function isLimitReached(): boolean {
  if (isUnlocked()) return false;
  return getUsageCount() >= FREE_LIMIT;
}

/** 重置使用次数（调试用） */
export function resetUsage(): void {
  safeSet(USAGE_COUNT_KEY, '0');
  safeSet(UNLOCKED_KEY, 'false');
}
