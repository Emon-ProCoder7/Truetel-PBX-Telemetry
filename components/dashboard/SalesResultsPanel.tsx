"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import type { RepOutcomeSummary, RepStats, SalesResults } from "@/lib/dashboard/types";
import { formatCount, formatPercent } from "@/lib/dashboard/format";
import { OutcomeTrendChart } from "./OutcomeTrendChart";

const SALES_REPS: RepOutcomeSummary["rep"][] = ["felix", "alvi", "jack"];
const REP_LABEL: Record<string, string> = { felix: "Felix", alvi: "Alvi", jack: "Jack" };

const EMPTY_OUTCOME = (rep: RepOutcomeSummary["rep"]): RepOutcomeSummary => ({
  rep,
  taggedContacts: 0,
  dmCollected: 0,
  new: 0,
  working: 0,
  appointmentBooked: 0,
  proposalSent: 0,
  won: 0,
  lost: 0,
  unclear: 0,
});

function monthLabel(monthValue: string): string {
  const d = new Date(`${monthValue}-01T00:00:00`);
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(d);
}

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const value = `${CURRENT_YEAR}-${String(i + 1).padStart(2, "0")}`;
  return { value, label: monthLabel(value) };
});
const CURRENT_MONTH_VALUE = `${CURRENT_YEAR}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

export function SalesResultsPanel() {
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH_VALUE);
  const [data, setData] = useState<SalesResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`/api/sales-results?view=month&anchor=${selectedMonth}-01`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `status ${res.status}`);
        if (!cancelled) setData(json as SalesResults);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  const outcomesByRep = new Map(data?.outcomes.map((o) => [o.rep, o]));
  const effortByRep = new Map<string, RepStats>(data?.effort.map((e) => [e.agentName.toLowerCase(), e]));

  const rows = SALES_REPS.map((rep) => ({
    rep,
    outcome: outcomesByRep.get(rep) ?? EMPTY_OUTCOME(rep),
    effort: effortByRep.get(rep) ?? null,
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      calls: acc.calls + (r.effort?.totalCalls ?? 0),
      connected: acc.connected + (r.effort?.connectedCalls ?? 0),
      tagged: acc.tagged + r.outcome.taggedContacts,
      dmCollected: acc.dmCollected + r.outcome.dmCollected,
      new: acc.new + r.outcome.new,
      working: acc.working + r.outcome.working,
      appointmentBooked: acc.appointmentBooked + r.outcome.appointmentBooked,
      proposalSent: acc.proposalSent + r.outcome.proposalSent,
      won: acc.won + r.outcome.won,
      lost: acc.lost + r.outcome.lost,
      unclear: acc.unclear + r.outcome.unclear,
    }),
    { calls: 0, connected: 0, tagged: 0, dmCollected: 0, new: 0, working: 0, appointmentBooked: 0, proposalSent: 0, won: 0, lost: 0, unclear: 0 }
  );

  // New + Working aren't results, just "not there yet" — one quiet line
  // instead of two bars competing with what actually happened.
  const funnelStages: { label: string; value: number; tone?: "won" | "lost" | "muted" }[] = [
    { label: "Still working", value: totals.new + totals.working, tone: "muted" },
    { label: "Appointment booked", value: totals.appointmentBooked },
    { label: "Proposal sent", value: totals.proposalSent },
    { label: "Won", value: totals.won, tone: "won" },
    { label: "Lost", value: totals.lost, tone: "lost" },
  ];
  const maxFunnel = Math.max(1, ...funnelStages.map((s) => s.value));

  return (
    <div className={styles.resultsPanel}>
      <div className={styles.resultsHead}>
        <div className={styles.resultsTitleGroup}>
          <span className={styles.resultsTitle}>Sales results — effort + outcome</span>
          <span className={styles.resultsSub}>
            {monthLabel(selectedMonth)} · Felix, Alvi, Jack — the reps tracked in GHL. Outcome
            counts are current status, attributed to the month each contact was tagged worked —
            a monthly figure, not a daily one.
          </span>
        </div>
        <select
          className={styles.monthSelect}
          aria-label="Month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {MONTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.value === CURRENT_MONTH_VALUE ? `${opt.label} (this month)` : opt.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className={styles.emptyState}>Couldn&apos;t load sales results: {error}</div>
      ) : !data ? (
        <div className={styles.emptyState}>Loading…</div>
      ) : (
        <>
          <div className={styles.resultsKpiRow}>
            <div className={styles.resultsKpiTile}>
              <div className={styles.resultsKpiLabel}>Calls made</div>
              <div className={styles.resultsKpiValue}>{formatCount(totals.calls)}</div>
            </div>
            <div className={styles.resultsKpiTile}>
              <div className={styles.resultsKpiLabel}>Connected rate</div>
              <div className={styles.resultsKpiValue}>
                {formatPercent(totals.calls > 0 ? totals.connected / totals.calls : 0)}
              </div>
            </div>
            <div className={styles.resultsKpiTile}>
              <div className={styles.resultsKpiLabel}>Leads tagged</div>
              <div className={styles.resultsKpiValue}>{formatCount(totals.tagged)}</div>
            </div>
            <div className={styles.resultsKpiTile}>
              <div className={styles.resultsKpiLabel}>Appointments booked</div>
              <div className={styles.resultsKpiValue} data-tone="good">
                {formatCount(totals.appointmentBooked)}
              </div>
            </div>
            <div className={styles.resultsKpiTile}>
              <div className={styles.resultsKpiLabel}>Proposals sent</div>
              <div className={styles.resultsKpiValue}>{formatCount(totals.proposalSent)}</div>
            </div>
            <div className={styles.resultsKpiTile}>
              <div className={styles.resultsKpiLabel}>Won / Lost</div>
              <div className={styles.resultsKpiValue}>
                <span style={{ color: "var(--good)" }}>{totals.won}</span>
                {" / "}
                <span style={{ color: "var(--critical)" }}>{totals.lost}</span>
              </div>
            </div>
          </div>

          <div className={styles.funnel}>
            {funnelStages.map((stage) => (
              <div className={styles.funnelRow} key={stage.label}>
                <span className={styles.funnelLabel}>{stage.label}</span>
                <div className={styles.funnelTrack}>
                  <span
                    className={styles.funnelFill}
                    data-tone={stage.tone}
                    style={{ width: `${(stage.value / maxFunnel) * 100}%` }}
                  />
                </div>
                <span className={styles.funnelCount}>{stage.value}</span>
              </div>
            ))}
          </div>

          <div className={styles.repTableScroll}>
            <table className={styles.repTable}>
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Calls</th>
                  <th>Connected</th>
                  <th>DM collected</th>
                  <th>Tagged</th>
                  <th>Appt. booked</th>
                  <th>Proposal sent</th>
                  <th>Won</th>
                  <th>Lost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ rep, outcome, effort }) => (
                  <tr key={rep}>
                    <td className={styles.repName}>{REP_LABEL[rep]}</td>
                    <td className={styles.cellNum}>{formatCount(effort?.totalCalls ?? 0)}</td>
                    <td className={styles.cellNum}>
                      {effort ? formatPercent(effort.connectedRate) : "0%"}
                    </td>
                    <td className={styles.cellNum}>{outcome.dmCollected}</td>
                    <td className={styles.cellNum}>{outcome.taggedContacts}</td>
                    <td className={styles.cellNum}>{outcome.appointmentBooked}</td>
                    <td className={styles.cellNum}>{outcome.proposalSent}</td>
                    <td className={styles.cellNum}>{outcome.won}</td>
                    <td className={styles.cellNum}>{outcome.lost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.sectionLabel}>
            <span>Monthly cohorts — {data.range.start.slice(0, 4)}</span>
            <span className={styles.panelMeta}>
              bar = leads tagged that month · color = where they stand today
            </span>
          </div>
          <OutcomeTrendChart trend={data.trend} year={data.range.start.slice(0, 4)} />

          {totals.unclear > 0 ? (
            <div className={styles.resultsFootnote}>
              {`${totals.unclear} more ${totals.unclear === 1 ? "contact is" : "contacts are"} sitting in a legacy pipeline stage ("Closed") that doesn't distinguish won from lost — worth a manual check.`}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
