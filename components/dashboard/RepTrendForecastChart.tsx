"use client";

import { useId, useMemo } from "react";
import styles from "./dashboard.module.css";
import type { ForecastPoint, VolumePoint } from "@/lib/dashboard/types";

const WIDTH = 600;
const HEIGHT = 160;
const PAD_TOP = 10;
const PAD_BOTTOM = 20;

function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(d);
}

export function RepTrendForecastChart({
  historical,
  forecast,
}: {
  historical: VolumePoint[];
  forecast: ForecastPoint[];
}) {
  const gradientId = useId();

  const { historyPath, areaPath, forecastPath, historyPts, forecastPts, todayX } = useMemo(() => {
    if (historical.length === 0) {
      return { historyPath: "", areaPath: "", forecastPath: "", historyPts: [], forecastPts: [], todayX: 0 };
    }
    const allVals = [...historical.map((d) => d.totalCalls), ...forecast.map((d) => d.projectedCalls)];
    const max = Math.max(1, ...allVals);
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const totalPoints = historical.length + forecast.length;
    const stepX = totalPoints > 1 ? WIDTH / (totalPoints - 1) : 0;

    const hPts = historical.map((d, i) => ({
      x: i * stepX,
      y: PAD_TOP + innerH - (d.totalCalls / max) * innerH,
      date: d.callDate,
      value: d.totalCalls,
    }));
    const fPts = forecast.map((d, i) => ({
      x: (historical.length + i) * stepX,
      y: PAD_TOP + innerH - (d.projectedCalls / max) * innerH,
      date: d.callDate,
      value: d.projectedCalls,
    }));

    const hPath = hPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area =
      hPts.length > 0
        ? `${hPath} L${hPts[hPts.length - 1].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} L${hPts[0].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} Z`
        : "";
    const fSeries = hPts.length > 0 ? [hPts[hPts.length - 1], ...fPts] : fPts;
    const fPath = fSeries.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    return {
      historyPath: hPath,
      areaPath: area,
      forecastPath: fPath,
      historyPts: hPts,
      forecastPts: fPts,
      todayX: hPts.length > 0 ? hPts[hPts.length - 1].x : 0,
    };
  }, [historical, forecast]);

  if (historyPts.length === 0) {
    return <div className={styles.emptyState}>Not enough call history yet to chart a trend.</div>;
  }

  const lastHistory = historyPts[historyPts.length - 1];

  return (
    <div className={styles.chartWrap} style={{ height: HEIGHT }}>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Call volume trend with 7-day forecast"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.26} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((frac) => {
          const y = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * frac;
          return <line key={frac} className={styles.chartGridLine} x1={0} x2={WIDTH} y1={y} y2={y} />;
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path className={styles.chartLine} d={historyPath} />
        <path className={styles.chartLineSecondary} d={forecastPath} />
        <circle className={styles.chartEndpoint} cx={lastHistory.x} cy={lastHistory.y} r={2.5} />

        <line
          x1={todayX}
          x2={todayX}
          y1={PAD_TOP}
          y2={HEIGHT - PAD_BOTTOM}
          stroke="var(--fg-faint)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />

        <text x={0} y={HEIGHT - 4} className={styles.chartAxisLabel}>
          {shortDate(historyPts[0].date)}
        </text>
        <text x={WIDTH} y={HEIGHT - 4} className={styles.chartAxisLabel} textAnchor="end">
          {forecastPts.length > 0 ? shortDate(forecastPts[forecastPts.length - 1].date) : shortDate(lastHistory.date)}
        </text>
      </svg>
    </div>
  );
}
