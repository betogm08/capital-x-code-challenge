// Normalizes to UTC midnight so it can be compared against "YYYY-MM-DD"
// dates (which Date already parses as UTC) without the current time
// introducing fractional-day differences.
export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}
