"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import styles from "./dashboard.module.css";
import { RepAnalyticsPanel } from "./RepAnalyticsPanel";
import { RepCallLog } from "./RepCallLog";

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

export function RepCallsModal({ agentName, range, periodLabel, onClose }: RepCallsModalProps) {
  const [tab, setTab] = useState<"overview" | "log">("overview");
  // null = the Call log tab mirrors the top-level Today/This week/This month
  // tab exactly as before. Set once the user picks a month from the Call
  // log's own dropdown, which then drives both the table and this header.
  const [logMonthOverride, setLogMonthOverride] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setTab("overview");
    setLogMonthOverride(null);
  }, [agentName]);

  const logRange = logMonthOverride ? monthBounds(logMonthOverride) : range;
  const logMonthValue = logMonthOverride ?? range.start.slice(0, 7);
  const showingLogOverride = tab === "log" && logMonthOverride !== null;
  const headerRange = showingLogOverride ? logRange : range;
  const headerLabel = showingLogOverride ? monthLabel(logMonthOverride!) : periodLabel;

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
          aria-label={`Performance for ${agentName}`}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.modalHeader}>
            <div>
              <div className={styles.modalTitle}>{agentName}</div>
              <div className={styles.modalSub}>
                {headerLabel} view · window shown: {shortDate(`${headerRange.start}T00:00:00`)}
                {headerRange.start !== headerRange.end
                  ? ` – ${shortDate(`${headerRange.end}T00:00:00`)}`
                  : ""}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className={styles.modalTabs} role="tablist" aria-label="Rep detail view">
                <button
                  className={styles.modalTab}
                  data-active={tab === "overview"}
                  role="tab"
                  aria-selected={tab === "overview"}
                  onClick={() => setTab("overview")}
                >
                  Overview
                </button>
                <button
                  className={styles.modalTab}
                  data-active={tab === "log"}
                  role="tab"
                  aria-selected={tab === "log"}
                  onClick={() => setTab("log")}
                >
                  Call log
                </button>
              </div>
              <button ref={closeBtnRef} className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          <div className={styles.modalBody}>
            {tab === "overview" ? (
              <RepAnalyticsPanel agentName={agentName} />
            ) : (
              <RepCallLog
                agentName={agentName}
                range={logRange}
                monthValue={logMonthValue}
                monthOptions={MONTH_OPTIONS}
                onMonthChange={setLogMonthOverride}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
