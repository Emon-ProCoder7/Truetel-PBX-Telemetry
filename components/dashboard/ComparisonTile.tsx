import styles from "./dashboard.module.css";
import type { PeriodAggregate } from "@/lib/dashboard/types";
import { computeDelta, formatCount, formatDuration, formatPercent } from "@/lib/dashboard/format";

function DeltaTag({ current, prior }: { current: number; prior: number }) {
  const delta = computeDelta(current, prior);
  const arrow = delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "–";
  const text = delta.pct === null ? (delta.direction === "up" ? "new" : "–") : formatPercent(Math.abs(delta.pct));
  return (
    <span className={styles.kpiDelta} data-dir={delta.direction}>
      {arrow} {text}
    </span>
  );
}

export function ComparisonTile({
  title,
  current,
  prior,
  priorLabel,
}: {
  title: string;
  current: PeriodAggregate;
  prior: PeriodAggregate;
  priorLabel: string;
}) {
  const currentAvgTalk = current.calls > 0 ? current.talkSeconds / current.calls : 0;
  const priorAvgTalk = prior.calls > 0 ? prior.talkSeconds / prior.calls : 0;

  return (
    <div className={styles.comparisonTile}>
      <div className={styles.comparisonTitle}>{title}</div>

      <div className={styles.comparisonRow}>
        <span className={styles.comparisonMetric}>Calls</span>
        <span className={styles.comparisonValues}>
          <span className={styles.comparisonPrior}>
            {formatCount(prior.calls)} {priorLabel}
          </span>
          <span>{formatCount(current.calls)}</span>
          <DeltaTag current={current.calls} prior={prior.calls} />
        </span>
      </div>

      <div className={styles.comparisonRow}>
        <span className={styles.comparisonMetric}>Connected rate</span>
        <span className={styles.comparisonValues}>
          <span className={styles.comparisonPrior}>{formatPercent(prior.connectedRate)}</span>
          <span>{formatPercent(current.connectedRate)}</span>
          <DeltaTag current={current.connectedRate} prior={prior.connectedRate} />
        </span>
      </div>

      <div className={styles.comparisonRow}>
        <span className={styles.comparisonMetric}>Avg talk time</span>
        <span className={styles.comparisonValues}>
          <span className={styles.comparisonPrior}>{formatDuration(priorAvgTalk)}</span>
          <span>{formatDuration(currentAvgTalk)}</span>
          <DeltaTag current={currentAvgTalk} prior={priorAvgTalk} />
        </span>
      </div>
    </div>
  );
}
