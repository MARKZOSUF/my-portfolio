/** Date helpers built on the platform Intl APIs (no extra dependencies). */

const DAY_MS = 86_400_000;

export function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function startOfDay(value: string | number | Date): Date {
  const d = toDate(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(value: string | number | Date, days: number): Date {
  return new Date(toDate(value).getTime() + days * DAY_MS);
}

/** Whole days between two dates, ignoring clock time. */
export function daysBetween(from: string | number | Date, to: string | number | Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function isToday(value: string | number | Date): boolean {
  return daysBetween(value, new Date()) === 0;
}

export function isOverdue(value: string | number | Date): boolean {
  return toDate(value).getTime() < Date.now();
}

/** ISO calendar date (YYYY-MM-DD) in the device timezone. */
export function isoDate(value: string | number | Date = new Date()): string {
  const d = toDate(value);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function formatDate(value: string | number | Date): string {
  return toDate(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | number | Date): string {
  return toDate(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** "in 3 days", "2 hours ago", "just now". */
export function relativeTime(value: string | number | Date): string {
  const deltaMs = toDate(value).getTime() - Date.now();
  const abs = Math.abs(deltaMs);
  if (abs < 60_000) return 'just now';
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * DAY_MS],
    ['month', 30 * DAY_MS],
    ['week', 7 * DAY_MS],
    ['day', DAY_MS],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const entry of units) {
    const unit = entry[0];
    const ms = entry[1];
    if (abs >= ms) return formatter.format(Math.round(deltaMs / ms), unit);
  }
  return 'just now';
}

/** Countdown label for an exam date. */
export function daysUntilLabel(examDate: string | number | Date): string {
  const days = daysBetween(new Date(), examDate);
  if (days < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}
