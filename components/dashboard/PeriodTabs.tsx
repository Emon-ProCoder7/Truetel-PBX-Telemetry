"use client";

import styles from "./dashboard.module.css";
import type { DashboardPeriod } from "@/lib/dashboard/types";

const OPTIONS: { key: DashboardPeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

export function PeriodTabs({
  value,
  onChange,
}: {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
}) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Period">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          className={styles.tab}
          data-active={value === opt.key}
          role="tab"
          aria-selected={value === opt.key}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
