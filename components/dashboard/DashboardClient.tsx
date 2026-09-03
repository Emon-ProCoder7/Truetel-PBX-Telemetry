"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./dashboard.module.css";
import { PeriodTabs } from "./PeriodTabs";
import { KpiCard } from "./KpiCard";
import { CallVolumeChart } from "./CallVolumeChart";
import { LiveCallFeed } from "./LiveCallFeed";
import { RepTable } from "./RepTable";
import { RepCallsModal } from "./RepCallsModal";
import { SalesResultsPanel } from "./SalesResultsPanel";
import type { DashboardOverview, DashboardPeriod } from "@/lib/dashboard/types";
import { computeDelta, formatRelativeTime } from "@/lib/dashboard/format";

const POLL_MS = 20_000;

export function DashboardClient({ initialData }: { initialData: DashboardOverview }) {
  const [period, setPeriod] = useState<DashboardPeriod>(initialData.period);
  const [data, setData] = useState<DashboardOverview>(initialData);
  const [isStale, setIsStale] = useState(false);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [, tick] = useState(0);
  const fetchSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const mySeq = ++fetchSeq.current;

    async function load() {
      try {
        const res = await fetch(`/api/overview?period=${period}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as DashboardOverview;
        if (!cancelled && mySeq === fetchSeq.current) {
          setData(json);
          setIsStale(false);
        }
      } catch {
        if (!cancelled) setIsStale(true);
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [period]);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const totalHistory = data.timeseries.slice(-8).map((p) => p.totalCalls);
  const connectedRateHistory = data.timeseries
    .slice(-8)
    .map((p) => (p.totalCalls > 0 ? (p.connectedCalls / p.totalCalls) * 100 : 0));

  const connectedRatePct = data.kpis.totalCalls > 0 ? data.kpis.connectedCalls / data.kpis.totalCalls : 0;
  const priorConnectedRatePct =
    data.priorKpis.totalCalls > 0 ? data.priorKpis.connectedCalls / data.priorKpis.totalCalls : 0;

  const periodLabel = period === "today" ? "today" : period === "week" ? "this week" : "this month";

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <span className={styles.brandTitle}>TrueTel — PBX Telemetry</span>
        </div>
        <div className={styles.topbarRight}>
          <PeriodTabs value={period} onChange={setPeriod} />
          <span className={styles.liveStatus}>
            <span
              className={styles.liveDot}
              style={isStale ? { background: "var(--critical)", boxShadow: "0 0 0 3px var(--critical-soft)" } : undefined}
            />
            {isStale ? "connection lost" : `updated ${formatRelativeTime(data.generatedAt)}`}
          </span>
        </div>
      </header>

      <section className={styles.kpiGrid}>
        <KpiCard
          index={0}
          label={`Total calls — ${periodLabel}`}
          value={data.kpis.totalCalls}
          unit="calls"
          delta={computeDelta(data.kpis.totalCalls, data.priorKpis.totalCalls)}
          history={totalHistory}
        />
        <KpiCard
          index={1}
          label="Connected rate"
          value={connectedRatePct * 100}
          unit="%"
          delta={computeDelta(connectedRatePct, priorConnectedRatePct)}
          history={connectedRateHistory}
        />
        <KpiCard
          index={2}
          label="Avg talk time"
          value={data.kpis.avgTalkSeconds / 60}
          decimals={1}
          unit="min"
          delta={computeDelta(data.kpis.avgTalkSeconds, data.priorKpis.avgTalkSeconds)}
          history={[]}
        />
        <KpiCard
          index={3}
          label="Active reps"
          value={data.kpis.activeReps}
          unit="reps"
          delta={computeDelta(data.kpis.activeReps, data.priorKpis.activeReps)}
          history={[]}
        />
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Call volume trend</span>
            <span className={styles.panelMeta}>
              {data.timeseries[0]?.callDate} → {data.timeseries[data.timeseries.length - 1]?.callDate}
            </span>
          </div>
          <CallVolumeChart data={data.timeseries} />
          <div className={styles.chartLegend}>
            <span className={styles.chartLegendItem}>
              <span className={styles.chartLegendSwatch} /> Total calls
            </span>
            <span className={styles.chartLegendItem}>
              <span className={styles.chartLegendSwatch} data-variant="secondary" /> Connected
            </span>
          </div>
        </div>

        <LiveCallFeed calls={data.recent} />
      </section>

      <RepTable reps={data.reps} onSelectRep={setSelectedRep} />

      <SalesResultsPanel />

      {selectedRep ? (
        <RepCallsModal
          agentName={selectedRep}
          range={data.range}
          periodLabel={periodLabel}
          onClose={() => setSelectedRep(null)}
        />
      ) : null}
    </div>
  );
}
