import styles from "./dashboard.module.css";
import type { OutcomeBucket, OutcomeTrendPoint } from "@/lib/dashboard/types";

// New + Working aren't results, just "hasn't gotten there yet" — merged into
// one quiet segment so the stack reads as results first, backlog second.
type DisplayBucket = "still_working" | "appointment_booked" | "proposal_sent" | "won" | "lost" | "unclear";

const DISPLAY_ORDER: DisplayBucket[] = [
  "still_working",
  "appointment_booked",
  "proposal_sent",
  "won",
  "lost",
  "unclear",
];

const DISPLAY_LABEL: Record<DisplayBucket, string> = {
  still_working: "Still working",
  appointment_booked: "Appt. booked",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
  unclear: "Unclear",
};

const DISPLAY_COLOR: Record<DisplayBucket, string> = {
  still_working: "var(--fg-faint)",
  appointment_booked: "var(--accent)",
  // A distinct hue on purpose — proposal_sent sitting between two cyans
  // made the stack unreadable; violet reads clearly against the dark ground.
  proposal_sent: "#a78bfa",
  won: "var(--good)",
  lost: "var(--critical)",
  unclear: "var(--warn)",
};

function toDisplayBucket(bucket: OutcomeBucket): DisplayBucket {
  return bucket === "new" || bucket === "working" ? "still_working" : bucket;
}

const MONTH_LABEL = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("en-AU", { month: "short" }).format(new Date(Date.UTC(2000, i, 1)))
);

/**
 * Stacked bar per calendar month: bar height = how many contacts were tagged
 * worked that month, segments = their CURRENT status (not what it was back
 * then). Reads as a cohort chart — "of the leads worked in March, where do
 * they stand today" — which is the honest shape of this data: outcomes are
 * a live snapshot attributed to an acquisition month, not a day-stamped
 * event stream (see the ghl_outcomes migration for why).
 */
export function OutcomeTrendChart({ trend, year }: { trend: OutcomeTrendPoint[]; year: string }) {
  const byMonth = new Map<number, Partial<Record<DisplayBucket, number>>>();
  for (const t of trend) {
    const [y, m] = t.tagMonth.split("-");
    if (y !== year) continue;
    const monthIndex = Number(m) - 1;
    const bucket = toDisplayBucket(t.bucket);
    const rec = byMonth.get(monthIndex) ?? {};
    rec[bucket] = (rec[bucket] ?? 0) + t.contacts;
    byMonth.set(monthIndex, rec);
  }

  const totals = Array.from({ length: 12 }, (_, i) => {
    const rec = byMonth.get(i) ?? {};
    return DISPLAY_ORDER.reduce((sum, b) => sum + (rec[b] ?? 0), 0);
  });
  const maxTotal = Math.max(1, ...totals);

  if (totals.every((t) => t === 0)) {
    return <div className={styles.emptyState}>No tagged leads yet in {year}.</div>;
  }

  return (
    <div className={styles.trendWrap}>
      <div className={styles.trendBars}>
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const rec = byMonth.get(monthIndex) ?? {};
          const total = totals[monthIndex];
          let cumulative = 0;
          return (
            <div className={styles.trendBarCol} key={monthIndex}>
              <span className={styles.trendBarTotal}>{total || ""}</span>
              <div className={styles.trendBarTrack}>
                {DISPLAY_ORDER.map((bucket) => {
                  const value = rec[bucket] ?? 0;
                  if (value === 0) return null;
                  const heightPct = (value / maxTotal) * 100;
                  const bottomPct = (cumulative / maxTotal) * 100;
                  cumulative += value;
                  return (
                    <span
                      key={bucket}
                      className={styles.trendSegment}
                      style={{
                        height: `${heightPct}%`,
                        bottom: `${bottomPct}%`,
                        background: DISPLAY_COLOR[bucket],
                      }}
                      title={`${DISPLAY_LABEL[bucket]}: ${value}`}
                    />
                  );
                })}
              </div>
              <span className={styles.trendBarMonth}>{MONTH_LABEL[monthIndex]}</span>
            </div>
          );
        })}
      </div>
      <div className={styles.trendLegend}>
        {DISPLAY_ORDER.map((bucket) => (
          <span className={styles.trendLegendItem} key={bucket}>
            <span className={styles.trendLegendSwatch} style={{ background: DISPLAY_COLOR[bucket] }} />
            {DISPLAY_LABEL[bucket]}
          </span>
        ))}
      </div>
    </div>
  );
}
