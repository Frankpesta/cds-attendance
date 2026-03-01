/**
 * Simple in-memory cache to reduce TiDB RU usage during peak traffic.
 * TTL in seconds. Cache is per-process (helps in serverless when same instance handles bursts).
 */

type CacheEntry<T> = { value: T; expiresAt: number };

const caches = new Map<string, CacheEntry<unknown>>();

function get<T>(key: string): T | null {
  const entry = caches.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    caches.delete(key);
    return null;
  }
  return entry.value;
}

function set<T>(key: string, value: T, ttlSeconds: number): void {
  caches.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/** Cache active meetings for today. TTL 10s - same for all scans during a burst. */
const ACTIVE_MEETINGS_TTL = 10;

export function getCachedActiveMeetings<T>(todayDate: string): T | null {
  return get<T>(`active-meetings:${todayDate}`);
}

export function setCachedActiveMeetings<T>(todayDate: string, value: T): void {
  set(`active-meetings:${todayDate}`, value, ACTIVE_MEETINGS_TTL);
}

/** Cache today's attendance list. TTL 8s - reduces polling RU load. */
const TODAY_ATTENDANCE_TTL = 8;

export function getCachedTodayAttendance<T>(todayDate: string): T | null {
  return get<T>(`today-attendance:${todayDate}`);
}

export function setCachedTodayAttendance<T>(todayDate: string, value: T): void {
  set(`today-attendance:${todayDate}`, value, TODAY_ATTENDANCE_TTL);
}

/** Cache CDS group by id. TTL 60s - groups rarely change. */
const CDS_GROUP_TTL = 60;

export function getCachedCdsGroup<T>(groupId: string): T | null {
  return get<T>(`cds-group:${groupId}`);
}

export function setCachedCdsGroup<T>(groupId: string, value: T): void {
  set(`cds-group:${groupId}`, value, CDS_GROUP_TTL);
}
