export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  return `${m}m ${rem}s`;
}

export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-AU").format(Math.round(n));
}

export type Delta = { pct: number | null; direction: "up" | "down" | "flat" };

export function computeDelta(current: number, prior: number): Delta {
  if (prior === 0) {
    if (current === 0) return { pct: null, direction: "flat" };
    return { pct: null, direction: "up" };
  }
  const pct = (current - prior) / prior;
  if (Math.abs(pct) < 0.005) return { pct: 0, direction: "flat" };
  return { pct, direction: pct > 0 ? "up" : "down" };
}

export function formatRelativeTime(iso: string, nowMs = Date.now()): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((nowMs - then) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
