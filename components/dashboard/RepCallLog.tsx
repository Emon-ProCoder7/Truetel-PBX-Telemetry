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

export function RepCallLog({
  agentName,
  range,
}: {
  agentName: string;
  range: { start: string; end: string };
}) {
  const [calls, setCalls] = useState<CallDetail[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCalls(null);
    setError(null);

    async function load() {
      try {
        const params = new URLSearchParams({ agent: agentName, start: range.start, end: range.end });
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
  }, [agentName, range.start, range.end]);

  if (error) return <div className={styles.modalStatusRow}>Couldn&apos;t load calls: {error}</div>;
  if (calls === null) return <div className={styles.modalStatusRow}>Loading calls…</div>;
  if (calls.length === 0) return <div className={styles.modalStatusRow}>No calls in this window.</div>;

  return (
    <>
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
