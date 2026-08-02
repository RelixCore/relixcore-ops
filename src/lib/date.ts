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
