import styles from "./dashboard.module.css";

type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
};

export function Sparkline({ values, width = 96, height = 28 }: SparklineProps) {
  if (values.length < 2) {
    return <svg className={styles.sparkline} width={width} height={height} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      className={styles.sparkline}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path d={linePath} fill="none" stroke="var(--fg-faint)" strokeWidth={1.25} />
      <circle cx={lastX} cy={lastY} r={2} fill="var(--accent)" />
    </svg>
  );
}
