'use client';

const FREE_LIMIT = 1;
const USAGE_COUNT_KEY = 'ziwei_ai_usage_count';
const UNLOCKED_KEY = 'ziwei_ai_unlocked';

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in private browsing modes.
  }
}

export function getUsageCount(): number {
  const raw = safeGet(USAGE_COUNT_KEY);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

export function incrementUsage(): number {
  const next = getUsageCount() + 1;
  safeSet(USAGE_COUNT_KEY, String(next));
  return next;
}

export function isUnlocked(): boolean {
  return safeGet(UNLOCKED_KEY) === 'true';
}

export function setUnlocked(value: boolean): void {
  safeSet(UNLOCKED_KEY, String(value));
}

export function remainingFree(): number {
  return Math.max(0, FREE_LIMIT - getUsageCount());
}

export function isLimitReached(): boolean {
  if (isUnlocked()) return false;
  return getUsageCount() >= FREE_LIMIT;
}

export function resetUsage(): void {
  safeSet(USAGE_COUNT_KEY, '0');
  safeSet(UNLOCKED_KEY, 'false');
}
