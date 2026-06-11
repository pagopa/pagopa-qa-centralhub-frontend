"use client";

import { useState } from "react";
import { fmtNumberIt } from "@/lib/format";

export interface LineChartPoint {
  date: string;
  value: number;
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = 8;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

export function LineChart({ points }: { points: LineChartPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-[12px] text-text-muted">Nessun dato</p>;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const xStep = points.length > 1 ? (WIDTH - PADDING * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: PADDING + i * xStep,
    y: HEIGHT - PADDING - ((p.value - min) / range) * (HEIGHT - PADDING * 2),
    ...p,
  }));

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const active = hover !== null ? coords[hover] : coords[coords.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: HEIGHT }}>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {coords.map((c, i) => (
          <circle
            key={c.date}
            cx={c.x}
            cy={c.y}
            r={hover === i ? 4 : 2.5}
            fill="var(--accent)"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <p className="text-[12px] text-text-dim font-mono">
        {fmtDate(active.date)}: <span className="text-text font-medium">{fmtNumberIt(active.value)}</span>
      </p>
    </div>
  );
}
