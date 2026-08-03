import styles from "./dashboard.module.css";
import type { VolumePoint } from "@/lib/dashboard/types";

function dayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-AU", { weekday: "short" }).format(d);
}

export function RepWeekBars({
  daily,
  weekStart,
  weekEnd,
  teamAvgCallsPerRepPerDay,
}: {
  daily: VolumePoint[];
  weekStart: string;
  weekEnd: string;
  teamAvgCallsPerRepPerDay: number;
}) {
  const days = daily.filter((d) => d.callDate >= weekStart && d.callDate <= weekEnd);
  const maxCalls = Math.max(1, teamAvgCallsPerRepPerDay, ...days.map((d) => d.totalCalls));
  const parPct = Math.min(100, (teamAvgCallsPerRepPerDay / maxCalls) * 100);

  if (days.length === 0) {
    return <div className={styles.emptyState}>No calls yet this week.</div>;
  }

  return (
    <div className={styles.weekBars}>
      {teamAvgCallsPerRepPerDay > 0 ? (
        <span
          className={styles.weekParLine}
          style={{ bottom: `${parPct}%` }}
          title={`Team average: ${teamAvgCallsPerRepPerDay.toFixed(1)} calls/day`}
        />
      ) : null}
      {days.map((d) => {
        const isToday = d.callDate === weekEnd;
        const heightPct = Math.max(2, (d.totalCalls / maxCalls) * 100);
        return (
          <div key={d.callDate} className={styles.weekBarCol}>
            <span className={styles.weekBarValue}>{d.totalCalls}</span>
            <div className={styles.weekBarTrack}>
              <span
                className={styles.weekBarFill}
                data-today={isToday}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className={styles.weekBarDay} data-today={isToday}>
              {dayLabel(d.callDate)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
