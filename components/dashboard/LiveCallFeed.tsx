"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import type { RecentCall } from "@/lib/dashboard/types";
import { formatRelativeTime } from "@/lib/dashboard/format";

export function LiveCallFeed({ calls }: { calls: RecentCall[] }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Live call feed</span>
        <span className={styles.panelMeta}>last {calls.length}</span>
      </div>
      {calls.length === 0 ? (
        <div className={styles.emptyState}>No calls yet.</div>
      ) : (
        <ul className={styles.feedList}>
          {calls.map((call) => (
            <li key={call.callId} className={styles.feedItem}>
              <span className={styles.feedDirIcon} data-dir={call.callDirection ?? "Outbound"}>
                {call.callDirection === "Inbound" ? "IN" : "OUT"}
              </span>
              <span className={styles.feedBody}>
                <span className={styles.feedAgent}>{call.agentName ?? "Unassigned"}</span>
                <span className={styles.feedMeta}>
                  {call.phoneNumber ?? "Unknown number"} · {call.talkTime ?? call.totalDuration ?? "—"}
                </span>
              </span>
              <span className={styles.feedRight}>
                <span className={styles.feedTime}>{formatRelativeTime(call.callTimestamp)}</span>
                <span
                  className={styles.feedStatus}
                  data-status={call.callStatus === "Connected" ? "Connected" : "other"}
                >
                  {call.callStatus ?? "Unknown"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
