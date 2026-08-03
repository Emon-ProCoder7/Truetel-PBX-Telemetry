"use client";

import { motion } from "motion/react";
import styles from "./dashboard.module.css";
import { Sparkline } from "./Sparkline";
import { useCountUp } from "@/lib/dashboard/use-count-up";
import { formatCount, formatPercent, type Delta } from "@/lib/dashboard/format";

type KpiCardProps = {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  delta: Delta;
  deltaLabel?: string;
  history: number[];
  index?: number;
};

export function KpiCard({
  label,
  value,
  unit,
  decimals = 0,
  delta,
  deltaLabel = "vs prior period",
  history,
  index = 0,
}: KpiCardProps) {
  const animated = useCountUp(value);
  const displayValue = decimals > 0 ? animated.toFixed(decimals) : formatCount(animated);

  const arrow = delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "–";
  const deltaText =
    delta.pct === null
      ? delta.direction === "up"
        ? "new"
        : "–"
      : formatPercent(Math.abs(delta.pct));

  return (
    <motion.div
      className={styles.kpiCard}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <Sparkline values={history.length >= 2 ? history : [0, 0]} width={64} height={22} />
      </div>
      <div className={styles.kpiValueRow}>
        <span className={styles.kpiValue}>{displayValue}</span>
        {unit ? <span className={styles.kpiUnit}>{unit}</span> : null}
      </div>
      <div className={styles.kpiFoot}>
        <span className={styles.kpiDelta} data-dir={delta.direction}>
          {arrow} {deltaText}
        </span>
        <span className={styles.kpiUnit}>{deltaLabel}</span>
      </div>
    </motion.div>
  );
}
