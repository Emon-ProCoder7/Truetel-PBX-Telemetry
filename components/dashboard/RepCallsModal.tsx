"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import styles from "./dashboard.module.css";
import type { CallDetail } from "@/lib/dashboard/types";
import { formatClock } from "@/lib/dashboard/format";

type RepCallsModalProps = {
  agentName: string;
  range: { start: string; end: string };
  periodLabel: string;
  onClose: () => void;
};

function shortDate(dateLike: string): string {
  const d = new Date(dateLike);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function RepCallsModal({ agentName, range, periodLabel, onClose }: RepCallsModalProps) {
  const [calls, setCalls] = useState<CallDetail[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    closeBtnRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          className={styles.modalPanel}
          role="dialog"
          aria-modal="true"
          aria-label={`Calls for ${agentName}`}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.modalHeader}>
            <div>
              <div className={styles.modalTitle}>{agentName}</div>
              <div className={styles.modalSub}>
                All calls — {periodLabel} · {shortDate(`${range.start}T00:00:00`)}
                {range.start !== range.end ? ` – ${shortDate(`${range.end}T00:00:00`)}` : ""}
                {calls ? ` · ${calls.length} call${calls.length === 1 ? "" : "s"}` : ""}
              </div>
            </div>
            <button ref={closeBtnRef} className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className={styles.modalBody}>
            {error ? (
              <div className={styles.modalStatusRow}>Couldn&apos;t load calls: {error}</div>
            ) : calls === null ? (
              <div className={styles.modalStatusRow}>Loading calls…</div>
            ) : calls.length === 0 ? (
              <div className={styles.modalStatusRow}>No calls in this window.</div>
            ) : (
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
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
