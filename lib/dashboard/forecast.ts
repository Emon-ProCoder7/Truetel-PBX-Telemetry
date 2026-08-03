import type { ForecastPoint } from "./types";

/** Ordinary least-squares fit over evenly-spaced points (x = 0..n-1). */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

function addDaysISO(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Naive linear projection from the trailing `windowDays` of daily call
 * counts. Deliberately simple (no seasonality) — framed to the viewer as a
 * rough trend line, not a guarantee.
 */
export function forecastCalls(
  dailyCalls: { callDate: string; totalCalls: number }[],
  windowDays: number,
  horizonDays: number
): { points: ForecastPoint[]; direction: "up" | "down" | "flat" } {
  const window = dailyCalls.slice(-windowDays);
  if (window.length < 3) {
    return { points: [], direction: "flat" };
  }

  const { slope, intercept } = linearRegression(window.map((d) => d.totalCalls));
  const lastDate = window[window.length - 1].callDate;
  const n = window.length;

  const points: ForecastPoint[] = [];
  for (let i = 1; i <= horizonDays; i++) {
    const projected = Math.max(0, Math.round(intercept + slope * (n - 1 + i)));
    points.push({ callDate: addDaysISO(lastDate, i), projectedCalls: projected });
  }

  const magnitude = Math.abs(slope);
  const direction = magnitude < 0.08 ? "flat" : slope > 0 ? "up" : "down";
  return { points, direction };
}
