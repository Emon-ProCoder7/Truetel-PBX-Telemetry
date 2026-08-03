"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import { RepWeekBars } from "./RepWeekBars";
import { RepTrendForecastChart } from "./RepTrendForecastChart";
import { ComparisonTile } from "./ComparisonTile";
import type { RepAnalytics } from "@/lib/dashboard/types";
import { currentRangeFor } from "@/lib/dashboard/date-range";
import { formatCount } from "@/lib/dashboard/format";

export function RepAnalyticsPanel({ agentName }: { agentName: string }) {
  const [data, setData] = useState<RepAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    fetch(`/api/rep-analytics?agent=${encodeURIComponent(agentName)}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `status ${res.status}`);
        if (!cancelled) setData(json as RepAnalytics);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });

    return () => {
      cancelled = true;
    };
  }, [agentName]);

  if (error) return <div className={styles.modalStatusRow}>Couldn&apos;t load analytics: {error}</div>;
  if (!data) return <div className={styles.modalStatusRow}>Loading analytics…</div>;

  const thisWeekRange = currentRangeFor("week");

  return (
    <div>
      {data.insights.length > 0 ? (
        <ul className={styles.insightList}>
          {data.insights.map((text, i) => (
            <li key={i} className={styles.insightChip}>
              {text}
            </li>
          ))}
        </ul>
      ) : null}

      <div className={styles.statRow}>
        <div className={styles.statTile}>
          <div className={styles.statTileLabel}>Today</div>
          <div className={styles.statTileValue}>{formatCount(data.today.calls)}</div>
          <div className={styles.statTileSub}>calls so far</div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statTileLabel}>Yesterday</div>
          <div className={styles.statTileValue}>{formatCount(data.yesterday.calls)}</div>
          <div className={styles.statTileSub}>calls</div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statTileLabel}>7-day average</div>
          <div className={styles.statTileValue}>{data.sevenDayAvgCalls.toFixed(1)}</div>
          <div className={styles.statTileSub}>calls / day</div>
        </div>
      </div>

      <div className={styles.sectionLabel}>
        <span>This week, day by day</span>
        <span className={styles.panelMeta}>dashed line = team average/day</span>
      </div>
      <RepWeekBars
        daily={data.daily}
        weekStart={thisWeekRange.start}
        weekEnd={thisWeekRange.end}
        teamAvgCallsPerRepPerDay={data.teamAvgCallsPerRepPerDay}
      />

      <div className={styles.sectionLabel}>
        <span>Week &amp; month over month</span>
      </div>
      <div className={styles.comparisonGrid}>
        <ComparisonTile
          title="This week vs last week"
          current={data.thisWeek}
          prior={data.lastWeek}
          priorLabel="last wk"
        />
        <ComparisonTile
          title="This month vs last month"
          current={data.thisMonth}
          prior={data.lastMonth}
          priorLabel="last mo"
        />
      </div>

      <div className={styles.sectionLabel}>
        <span>30-day trend + 7-day projection</span>
        <span className={styles.panelMeta}>simple trend line, not a guarantee</span>
      </div>
      <RepTrendForecastChart historical={data.daily.slice(-30)} forecast={data.forecastNext7} />
      <div className={styles.chartLegend} style={{ marginTop: 8 }}>
        <span className={styles.chartLegendItem}>
          <span className={styles.chartLegendSwatch} /> Actual
        </span>
        <span className={styles.chartLegendItem}>
          <span className={styles.chartLegendSwatch} data-variant="secondary" /> Projected
        </span>
      </div>
    </div>
  );
}
