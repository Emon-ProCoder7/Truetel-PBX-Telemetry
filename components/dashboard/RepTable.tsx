"use client";

import { useMemo, useState } from "react";
import styles from "./dashboard.module.css";
import type { RepStats } from "@/lib/dashboard/types";
import { formatCount, formatDuration, formatPercent } from "@/lib/dashboard/format";

type SortKey = "totalCalls" | "connectedRate" | "totalTalkSeconds" | "outboundCalls" | "inboundCalls";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "totalCalls", label: "Total calls" },
  { key: "outboundCalls", label: "Outbound" },
  { key: "inboundCalls", label: "Inbound" },
  { key: "connectedRate", label: "Connected rate" },
  { key: "totalTalkSeconds", label: "Total talk time" },
];

function rateTier(rate: number): "good" | "warn" | "critical" {
  if (rate >= 0.6) return "good";
  if (rate >= 0.4) return "warn";
  return "critical";
}

export function RepTable({
  reps,
  onSelectRep,
}: {
  reps: RepStats[];
  onSelectRep: (agentName: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("totalCalls");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const teamAverageCalls = useMemo(
    () => (reps.length ? reps.reduce((sum, r) => sum + r.totalCalls, 0) / reps.length : 0),
    [reps]
  );
  const maxCalls = useMemo(() => Math.max(1, ...reps.map((r) => r.totalCalls)), [reps]);

  const sorted = useMemo(() => {
    const copy = [...reps];
    copy.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });
    return copy;
  }, [reps, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (reps.length === 0) {
    return (
      <div className={styles.repPanel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Rep performance</span>
        </div>
        <div className={styles.emptyState}>No calls logged for this period yet.</div>
      </div>
    );
  }

  return (
    <div className={styles.repPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Rep performance</span>
        <span className={styles.panelMeta}>{reps.length} active</span>
      </div>
      <div className={styles.repTableScroll}>
        <table className={styles.repTable}>
          <thead>
            <tr>
              <th>Rep</th>
              {COLUMNS.map((col) => (
                <th key={col.key} onClick={() => toggleSort(col.key)}>
                  {col.label}
                  {sortKey === col.key ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((rep) => {
              const flagged =
                rep.connectedRate < 0.4 ||
                (teamAverageCalls > 0 && rep.totalCalls < teamAverageCalls * 0.5);
              const tier = rateTier(rep.connectedRate);
              return (
                <tr
                  key={rep.agentName}
                  className={styles.repRowClickable}
                  tabIndex={0}
                  role="button"
                  aria-label={`View all calls for ${rep.agentName}`}
                  onClick={() => onSelectRep(rep.agentName)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectRep(rep.agentName);
                    }
                  }}
                >
                  <td>
                    <div className={styles.repNameCell}>
                      {flagged ? (
                        <span
                          className={styles.repFlagDot}
                          title="Below 40% connected rate, or under half the team's average call volume"
                        />
                      ) : (
                        <span style={{ width: 7 }} />
                      )}
                      <span className={styles.repName}>{rep.agentName}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.barTrack}>
                      <span
                        className={styles.barFill}
                        style={{ width: `${(rep.totalCalls / maxCalls) * 100}%` }}
                      />
                    </div>
                    <span className={styles.cellNum} style={{ marginLeft: 10 }}>
                      {formatCount(rep.totalCalls)}
                    </span>
                  </td>
                  <td className={styles.cellNum}>{formatCount(rep.outboundCalls)}</td>
                  <td className={styles.cellNum}>{formatCount(rep.inboundCalls)}</td>
                  <td>
                    <div className={styles.rateTrack}>
                      <span
                        className={styles.rateFill}
                        data-tier={tier}
                        style={{ width: `${Math.min(100, rep.connectedRate * 100)}%` }}
                      />
                      <span className={styles.rateTarget} style={{ left: "60%" }} />
                    </div>
                    <span className={styles.cellNum} style={{ marginLeft: 10 }}>
                      {formatPercent(rep.connectedRate)}
                    </span>
                  </td>
                  <td className={styles.cellNum}>{formatDuration(rep.totalTalkSeconds)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.methodNote}>
        Click a rep to see every call in this period. Marker at 60% connected rate = team target.
        Dot flags reps under 40% connected, or under half the team&apos;s average call count.
      </div>
    </div>
  );
}
