type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
  yAxisLabel?: string;
};

export function Sparkline({
  data,
  width = 150,
  height = 100,
  color = "var(--accent)",
  area = true,
  yAxisLabel = "PASS RATE",
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const plotLeft = 38;
  const plotRight = width - 5;
  const plotTop = 8;
  const plotBottom = height - 10;
  const axisMax = 1;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;

  const points = data.map((v, i) => ({
    x: plotLeft + (i / (data.length - 1)) * plotWidth,
    y: plotBottom - (Math.max(0, v) / axisMax) * plotHeight,
  }));

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${path} L ${plotRight} ${plotBottom} L ${plotLeft} ${plotBottom} Z`;
  const ticks = [0, 0.5, 1];
  const yForValue = (value: number) => plotBottom - (value / axisMax) * plotHeight;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${yAxisLabel} nel tempo, da run precedente a recente`}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={plotLeft} y1={yForValue(tick)} x2={plotRight} y2={yForValue(tick)} stroke="var(--border)" strokeWidth={0.7} />
          <text x={plotLeft - 4} y={yForValue(tick) + 2.5} textAnchor="end" fill="var(--text-muted)" fontSize={10}>
            {`${Math.round(tick * 100)}%`}
          </text>
        </g>
      ))}
      <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="var(--text-muted)" strokeWidth={0.8} />
      <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="var(--text-muted)" strokeWidth={0.8} />
      <text x={14} y={(plotTop + plotBottom) / 2} textAnchor="middle" fill="var(--text-muted)" fontSize={9} transform={`rotate(-90 7 ${(plotTop + plotBottom) / 2})`}>
        {yAxisLabel}
      </text>
      <path d={`M ${plotRight - 4} ${plotBottom - 2} L ${plotRight} ${plotBottom} L ${plotRight - 4} ${plotBottom + 2}`} fill="none" stroke="var(--text-muted)" strokeWidth={0.8} />
      {area && (
        <path d={areaPath} fill={color} fillOpacity={0.12} />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
