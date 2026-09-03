import type { DashboardPeriod } from "./types";

const MELBOURNE_TZ = "Australia/Melbourne";

/** YYYY-MM-DD for a given Date, evaluated in Melbourne local time. */
function toMelbourneDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MELBOURNE_TZ }).format(date);
}

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(dateStr: string, days: number): string {
  const d = parseDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toMelbourneDateString(d);
}

/** Melbourne weekday: 0 = Monday .. 6 = Sunday. */
function melbourneWeekday(dateStr: string): number {
  const jsDay = parseDateOnly(dateStr).getUTCDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

export type DateRange = { start: string; end: string };

export function currentRangeFor(period: DashboardPeriod): DateRange {
  const today = toMelbourneDateString(new Date());

  if (period === "today") {
    return { start: today, end: today };
  }

  if (period === "week") {
    const start = addDays(today, -melbourneWeekday(today));
    return { start, end: today };
  }

  // month: from the 1st of the current Melbourne month to today.
  const [y, m] = today.split("-");
  return { start: `${y}-${m}-01`, end: today };
}

/** The immediately preceding period of equal length, for "vs last period" context. */
export function priorRangeFor(range: DateRange): DateRange {
  const lengthDays =
    Math.round(
      (parseDateOnly(range.end).getTime() - parseDateOnly(range.start).getTime()) / 86_400_000
    ) + 1;
  const end = addDays(range.start, -1);
  const start = addDays(end, -(lengthDays - 1));
  return { start, end };
}

/** Fixed-length trailing window (e.g. last 14 days) for the trend chart, independent of period. */
export function trailingRange(days: number): DateRange {
  const today = toMelbourneDateString(new Date());
  return { start: addDays(today, -(days - 1)), end: today };
}

/** Full calendar month containing `anchor` (default: today, Melbourne). */
export function monthRange(anchor?: string): DateRange {
  const base = anchor ?? toMelbourneDateString(new Date());
  const [y, m] = base.split("-");
  const start = `${y}-${m}-01`;
  const lastDay = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
  const end = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/** Full calendar year containing `anchor` (default: today, Melbourne). */
export function yearRange(anchor?: string): DateRange {
  const base = anchor ?? toMelbourneDateString(new Date());
  const y = base.split("-")[0];
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}
