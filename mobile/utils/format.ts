/** Pure display formatters. No React, no side effects. */

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

export function formatPercent(ratio: number, digits = 0): string {
  if (!Number.isFinite(ratio)) return '0%';
  return `${(Math.max(0, Math.min(1, ratio)) * 100).toFixed(digits)}%`;
}

export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'] as const;
  let value = Math.max(0, bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const unit = units[unitIndex] ?? 'B';
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${unit}`;
}

export function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}\u2026`;
}

export function titleCase(text: string): string {
  return text
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => {
      const first = word.charAt(0).toUpperCase();
      return first + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/** Converts a mastery score (0..1) to a short human label. */
export function masteryLabel(mastery: number): 'Weak' | 'Developing' | 'Solid' | 'Strong' {
  if (mastery < 0.35) return 'Weak';
  if (mastery < 0.6) return 'Developing';
  if (mastery < 0.85) return 'Solid';
  return 'Strong';
}
