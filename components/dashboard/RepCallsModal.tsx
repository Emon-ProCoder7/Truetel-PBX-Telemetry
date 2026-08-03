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

export function RepCallsModal({ agentName, range, periodLabel, onClose }: RepCallsModalProps) {
  const [tab, setTab] = useState<"overview" | "log">("overview");
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
  }, [agentName]);

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
                {periodLabel} view · window shown: {shortDate(`${range.start}T00:00:00`)}
                {range.start !== range.end ? ` – ${shortDate(`${range.end}T00:00:00`)}` : ""}
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
              <RepCallLog agentName={agentName} range={range} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
