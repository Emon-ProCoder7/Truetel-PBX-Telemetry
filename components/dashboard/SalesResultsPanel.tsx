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
  new: 0,
  working: 0,
  appointmentBooked: 0,
  proposalSent: 0,
  won: 0,
  lost: 0,
  unclear: 0,
});

function monthYearLabel(range: { start: string; end: string }, view: "month" | "year"): string {
  const d = new Date(`${range.start}T00:00:00`);
  return view === "month"
    ? new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(d)
    : new Intl.DateTimeFormat("en-AU", { year: "numeric" }).format(d);
}

export function SalesResultsPanel() {
  const [view, setView] = useState<"month" | "year">("month");
  const [data, setData] = useState<SalesResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`/api/sales-results?view=${view}`, { cache: "no-store" })
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
  }, [view]);

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
      new: acc.new + r.outcome.new,
      working: acc.working + r.outcome.working,
      appointmentBooked: acc.appointmentBooked + r.outcome.appointmentBooked,
      proposalSent: acc.proposalSent + r.outcome.proposalSent,
      won: acc.won + r.outcome.won,
      lost: acc.lost + r.outcome.lost,
      unclear: acc.unclear + r.outcome.unclear,
    }),
    { calls: 0, connected: 0, tagged: 0, new: 0, working: 0, appointmentBooked: 0, proposalSent: 0, won: 0, lost: 0, unclear: 0 }
  );

  const funnelStages: { label: string; value: number; tone?: "won" | "lost" }[] = [
    { label: "New", value: totals.new },
    { label: "Working", value: totals.working },
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
            {data ? monthYearLabel(data.range, data.view) : "…"} · Felix, Alvi, Jack — the
            reps tracked in GHL. Outcome counts are current status, attributed to the month each
            contact was tagged worked — a monthly figure, not a daily one.
          </span>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Results view">
          <button className={styles.tab} data-active={view === "month"} onClick={() => setView("month")}>
            This month
          </button>
          <button className={styles.tab} data-active={view === "year"} onClick={() => setView("year")}>
            This year
          </button>
        </div>
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

          {view === "year" ? (
            <>
              <div className={styles.sectionLabel}>
                <span>Monthly cohorts — {data.range.start.slice(0, 4)}</span>
                <span className={styles.panelMeta}>
                  bar = leads tagged that month · color = where they stand today
                </span>
              </div>
              <OutcomeTrendChart trend={data.trend} year={data.range.start.slice(0, 4)} />
            </>
          ) : null}

          <div className={styles.repTableScroll}>
            <table className={styles.repTable}>
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Calls</th>
                  <th>Connected</th>
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
