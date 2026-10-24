"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import styles from "./dashboard.module.css";
import type { OutcomeContact } from "@/lib/dashboard/types";
import { formatRelativeTime } from "@/lib/dashboard/format";

const REP_LABEL: Record<string, string> = { felix: "Felix", alvi: "Alvi", jack: "Jack", farhan: "Farhan" };

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  working: "Working",
  appointment_booked: "Appointment booked",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
  closed_unclear: "Unclear (legacy)",
  unmapped: "Unclear (unmapped stage)",
};

function monthLabel(monthValue: string): string {
  const d = new Date(`${monthValue.slice(0, 7)}-01T00:00:00`);
  return new Intl.DateTimeFormat("en-AU", { month: "short", year: "numeric" }).format(d);
}

export function OutcomeContactsModal({
  title,
  subtitle,
  start,
  end,
  buckets,
  rep,
  onClose,
}: {
  title: string;
  subtitle: string;
  start: string;
  end: string;
  buckets: string[];
  rep: string | null;
  onClose: () => void;
}) {
  const [contacts, setContacts] = useState<OutcomeContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    let cancelled = false;
    setContacts(null);
    setError(null);

    async function load() {
      try {
        const params = new URLSearchParams({ start, end, buckets: buckets.join(",") });
        if (rep) params.set("rep", rep);
        const res = await fetch(`/api/sales-results/contacts?${params.toString()}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `status ${res.status}`);
        if (!cancelled) setContacts(json.contacts as OutcomeContact[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load contacts");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [start, end, buckets, rep]);

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
          aria-label={title}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.modalHeader}>
            <div>
              <div className={styles.modalTitle}>{title}</div>
              <div className={styles.modalSub}>{subtitle}</div>
            </div>
            <button ref={closeBtnRef} className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className={styles.modalBody}>
            {error ? (
              <div className={styles.modalStatusRow}>Couldn&apos;t load contacts: {error}</div>
            ) : contacts === null ? (
              <div className={styles.modalStatusRow}>Loading contacts…</div>
            ) : contacts.length === 0 ? (
              <div className={styles.modalStatusRow}>No contacts in this stage for this window.</div>
            ) : (
              <table className={styles.repTable}>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>Rep</th>
                    <th>Tagged</th>
                    <th>Status</th>
                    <th>DM collected</th>
                    <th>Last synced</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={`${c.contactId}-${c.rep}`}>
                      <td>{c.contactName || "—"}</td>
                      <td className={styles.cellNum}>{c.phone ?? "—"}</td>
                      <td>{REP_LABEL[c.rep] ?? c.rep}</td>
                      <td className={styles.cellNum}>{monthLabel(c.tagMonth)}</td>
                      <td>{STATUS_LABEL[c.stageBucket] ?? c.stageBucket}</td>
                      <td className={styles.cellNum}>{c.dmCollected ? "Yes" : "—"}</td>
                      <td className={styles.cellNum}>{formatRelativeTime(c.syncedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
