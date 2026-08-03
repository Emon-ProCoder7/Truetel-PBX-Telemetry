"use client";

import { useId, useMemo, useState } from "react";
import styles from "./dashboard.module.css";
import type { VolumePoint } from "@/lib/dashboard/types";

type CallVolumeChartProps = {
  data: VolumePoint[];
};

const WIDTH = 600;
const HEIGHT = 190;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(d);
}

export function CallVolumeChart({ data }: CallVolumeChartProps) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { totalPath, areaPath, connectedPath, points } = useMemo(() => {
    if (data.length === 0) {
      return { totalPath: "", areaPath: "", connectedPath: "", points: [] };
    }
    const max = Math.max(1, ...data.map((d) => d.totalCalls));
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const stepX = data.length > 1 ? WIDTH / (data.length - 1) : 0;

    const pts = data.map((d, i) => {
      const x = i * stepX;
      const yTotal = PAD_TOP + innerH - (d.totalCalls / max) * innerH;
      const yConnected = PAD_TOP + innerH - (d.connectedCalls / max) * innerH;
      return { x, yTotal, yConnected, d };
    });

    const total = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.yTotal.toFixed(1)}`).join(" ");
    const connected = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.yConnected.toFixed(1)}`)
      .join(" ");
    const area = `${total} L${pts[pts.length - 1].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} L${pts[0].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} Z`;

    return { totalPath: total, areaPath: area, connectedPath: connected, points: pts };
  }, [data]);

  if (data.length === 0 || points.length === 0) {
    return <div className={styles.emptyState}>No call data in this window yet.</div>;
  }

  const last = points[points.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div className={styles.chartWrap}>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label="Daily call volume"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((frac) => {
          const y = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) * frac;
          return <line key={frac} className={styles.chartGridLine} x1={0} x2={WIDTH} y1={y} y2={y} />;
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path className={styles.chartLineSecondary} d={connectedPath} />
        <path className={styles.chartLine} d={totalPath} />
        <circle className={styles.chartEndpoint} cx={last.x} cy={last.yTotal} r={3} />

        {hovered ? (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="var(--fg-faint)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        ) : null}

        <text x={0} y={HEIGHT - 4} className={styles.chartAxisLabel}>
          {shortDate(points[0].d.callDate)}
        </text>
        <text x={WIDTH} y={HEIGHT - 4} className={styles.chartAxisLabel} textAnchor="end">
          {shortDate(points[points.length - 1].d.callDate)}
        </text>
      </svg>

      {hovered ? (
        <div
          style={{
            position: "absolute",
            left: `${(hovered.x / WIDTH) * 100}%`,
            top: 0,
            transform: `translateX(${hovered.x > WIDTH * 0.75 ? "-100%" : "0"})`,
            background: "var(--bg-panel)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: "0.72rem",
            fontFamily: "var(--font-mono)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ color: "var(--fg-dim)", marginBottom: 2 }}>{shortDate(hovered.d.callDate)}</div>
          <div>
            <span style={{ color: "var(--accent)" }}>●</span> {hovered.d.totalCalls} total
          </div>
          <div>
            <span style={{ color: "var(--fg-faint)" }}>●</span> {hovered.d.connectedCalls} connected
          </div>
        </div>
      ) : null}
    </div>
  );
}
