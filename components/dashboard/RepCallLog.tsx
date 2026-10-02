"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import type { CallDetail } from "@/lib/dashboard/types";
import { formatClock } from "@/lib/dashboard/format";

function shortDate(dateLike: string): string {
  const d = new Date(dateLike);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    day: "numeric",
    month: "short",
  }).format(d);
}

function monthLabel(monthValue: string): string {
  const d = new Date(`${monthValue}-01T00:00:00`);
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(d);
}

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const value = `${CURRENT_YEAR}-${String(i + 1).padStart(2, "0")}`;
  return { value, label: monthLabel(value) };
});

// Melbourne-local "today" as YYYY-MM-DD, matching how call_date is stamped
// everywhere else in this app (see the n8n ingestion Code nodes).
function todayMelbourne(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());
}

// Full calendar bounds for a "YYYY-MM" value, capped at today when the
// selected month is the current month in progress.
function monthBounds(monthValue: string): { start: string; end: string } {
  const [y, m] = monthValue.split("-").map(Number);
  const start = `${monthValue}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthEnd = `${monthValue}-${String(lastDay).padStart(2, "0")}`;
  const today = todayMelbourne();
  return { start, end: monthEnd > today ? today : monthEnd };
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCallsCsv(agentName: string, monthValue: string, calls: CallDetail[]) {
  const headers = [
    "Date",
    "Time",
    "Direction",
    "Phone number",
    "Status",
    "Talk time",
    "Ring time",
    "Total duration",
    "Recording",
  ];
  const rows = calls.map((call) => [
    shortDate(call.callTimestamp),
    formatClock(call.callTimestamp),
    call.callDirection ?? "Unknown",
    call.phoneNumber ?? "",
    call.callStatus ?? "Unknown",
    call.talkTime ?? "",
    call.ringTime ?? "",
    call.totalDuration ?? "",
    call.recordingFile ?? "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${agentName.toLowerCase().replace(/\s+/g, "-")}-calls-${monthValue}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function RepCallLog({
  agentName,
  range,
}: {
  agentName: string;
  range: { start: string; end: string };
}) {
  // null = defer to the parent-selected period (Today / This week / This
  // month) exactly as before. Set once the user picks a month from the
  // dropdown below, which then takes over regardless of the top-level tab.
  const [monthOverride, setMonthOverride] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallDetail[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMonthOverride(null);
  }, [agentName]);

  const effectiveRange = monthOverride ? monthBounds(monthOverride) : range;
  const selectedMonthValue = monthOverride ?? range.start.slice(0, 7);

  useEffect(() => {
    let cancelled = false;
    setCalls(null);
    setError(null);

    async function load() {
      try {
        const params = new URLSearchParams({
          agent: agentName,
          start: effectiveRange.start,
          end: effectiveRange.end,
        });
        const res = await fetch(`/api/rep-calls?${params.toString()}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `status ${res.status}`);
        if (!cancelled) {
          setCalls(json.calls as CallDetail[]);
          setTruncated(Boolean(json.truncated));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load calls");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentName, effectiveRange.start, effectiveRange.end]);

  const canDownload = (calls?.length ?? 0) > 0;

  const toolbar = (
    <div className={styles.logToolbar}>
      <select
        className={styles.monthSelect}
        aria-label="Month"
        value={selectedMonthValue}
        onChange={(e) => setMonthOverride(e.target.value)}
      >
        {MONTH_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={styles.csvDownloadBtn}
        disabled={!canDownload}
        onClick={() => calls && downloadCallsCsv(agentName, selectedMonthValue, calls)}
      >
        Download CSV
      </button>
    </div>
  );

  if (error) {
    return (
      <>
        {toolbar}
        <div className={styles.modalStatusRow}>Couldn&apos;t load calls: {error}</div>
      </>
    );
  }
  if (calls === null) {
    return (
      <>
        {toolbar}
        <div className={styles.modalStatusRow}>Loading calls…</div>
      </>
    );
  }
  if (calls.length === 0) {
    return (
      <>
        {toolbar}
        <div className={styles.modalStatusRow}>No calls in this window.</div>
      </>
    );
  }

  return (
    <>
      {toolbar}
      <table className={styles.repTable}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Direction</th>
            <th>Phone number</th>
            <th>Status</th>
            <th>Talk time</th>
            <th>Ring time</th>
            <th>Total duration</th>
            <th>Recording</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.callId}>
              <td className={styles.cellNum}>
                {shortDate(call.callTimestamp)} {formatClock(call.callTimestamp)}
              </td>
              <td>
                <span className={styles.dirBadge} data-dir={call.callDirection ?? "Outbound"}>
                  {call.callDirection ?? "Unknown"}
                </span>
              </td>
              <td className={styles.cellNum}>{call.phoneNumber ?? "—"}</td>
              <td>{call.callStatus ?? "Unknown"}</td>
              <td className={styles.cellNum}>{call.talkTime ?? "—"}</td>
              <td className={styles.cellNum}>{call.ringTime ?? "—"}</td>
              <td className={styles.cellNum}>{call.totalDuration ?? "—"}</td>
              <td>
                <span className={styles.recBadge} data-available={Boolean(call.recordingFile)}>
                  {call.recordingFile ? call.recordingFile : "None"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {truncated ? (
        <div className={styles.methodNote}>
          Showing the most recent 1,000 calls for this window. Narrow the period to see all.
        </div>
      ) : null}
    </>
  );
}
