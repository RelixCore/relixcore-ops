// Local-calendar-day key (not UTC), so "today" matches the user's own day.
export function todayKey(): string {
  return dateToKey(new Date());
}

function dateToKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// [start, end) local-calendar-day bounds for a YYYY-MM-DD key, for Prisma
// createdAt range queries.
export function dateKeyToRange(dateKey: string): { start: Date; end: Date } {
  const [year, month, day] = dateKey.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  return { start, end };
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return dateToKey(new Date(year, month - 1, day + days));
}

// b - a, in whole days. Safe to use on YYYY-MM-DD keys directly (no Date
// parsing pitfalls around timezones/DST) since each key is a local calendar day.
export function daysBetweenKeys(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const start = new Date(ay, am - 1, ad);
  const end = new Date(by, bm - 1, bd);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

// Inclusive list of every date key from `start` to `end` (end >= start).
export function enumerateDateKeys(start: string, end: string): string[] {
  const count = daysBetweenKeys(start, end);
  if (count < 0) return [];
  const keys: string[] = [];
  for (let i = 0; i <= count; i++) keys.push(shiftDateKey(start, i));
  return keys;
}
