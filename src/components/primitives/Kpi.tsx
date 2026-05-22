import { type ReactNode } from "react";

interface KpiProps {
  label: string;
  value: string | number;
  delta?: number;
  status?: "success" | "danger" | "warning" | "info";
  children?: ReactNode; // slot for a Sparkline
}

const STATUS_COLOR: Record<string, string> = {
  success: "var(--success)",
  danger:  "var(--danger)",
  warning: "var(--warning)",
  info:    "var(--info)",
};

export function Kpi({ label, value, delta, status, children }: KpiProps) {
  const deltaColor =
    delta === undefined ? undefined
    : delta > 0 ? "var(--success)"
    : delta < 0 ? "var(--danger)"
    : "var(--text-muted)";

  return (
    <div
      className="flex flex-col gap-1 rounded-[var(--radius)] bg-surface border border-border p-[var(--pad)]"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <span
        className="font-mono font-medium uppercase text-text-muted"
        style={{ fontSize: 10, letterSpacing: ".06em" }}
      >
        {label}
      </span>

      <div className="flex items-end justify-between gap-3">
        <span
          className="font-mono font-semibold leading-none tabular-nums"
          style={{
            fontSize: 28,
            color: status ? STATUS_COLOR[status] : "var(--text)",
          }}
        >
          {value}
        </span>
        {children && <div className="shrink-0">{children}</div>}
      </div>

      {delta !== undefined && (
        <span className="text-[12px] font-mono" style={{ color: deltaColor }}>
          {delta > 0 ? "+" : ""}{delta}%
        </span>
      )}
    </div>
  );
}
