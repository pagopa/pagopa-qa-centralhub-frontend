import type { DqControlStatus, DqRiskLevel } from "@/types/index";

type DqBadgeProps =
  | { variant: "risk"; value: DqRiskLevel }
  | { variant: "status"; value: DqControlStatus };

const RISK_STYLE: Record<DqRiskLevel, { color: string; bg: string }> = {
  ALTO: { color: "var(--danger)", bg: "var(--danger-soft)" },
  MEDIO: { color: "var(--warning)", bg: "var(--warning-soft)" },
  BASSO: { color: "var(--success)", bg: "var(--success-soft)" },
};

const STATUS_STYLE: Record<DqControlStatus, { color: string; bg: string; label: string }> = {
  da_implementare: { color: "var(--text-muted)", bg: "var(--neutral-soft)", label: "Da implementare" },
  in_sviluppo: { color: "var(--info)", bg: "var(--info-soft)", label: "In sviluppo" },
  attivo: { color: "var(--success)", bg: "var(--success-soft)", label: "Attivo" },
  non_attivo: { color: "var(--text-muted)", bg: "var(--neutral-soft)", label: "Non attivo" },
};

export function DqBadge(props: DqBadgeProps) {
  if (props.variant === "risk") {
    const s = RISK_STYLE[props.value];
    return (
      <span
        className="inline-flex items-center font-mono rounded-full uppercase"
        style={{ fontSize: 11, padding: "2px 8px", color: s.color, background: s.bg, fontWeight: 600, letterSpacing: ".04em" }}
      >
        {props.value}
      </span>
    );
  }

  const s = STATUS_STYLE[props.value];
  return (
    <span
      className="inline-flex items-center gap-[5px] font-mono rounded-full"
      style={{ fontSize: 11, padding: "2px 8px", color: s.color, background: s.bg }}
    >
      <span className="inline-block rounded-full shrink-0" style={{ width: 6, height: 6, background: s.color }} />
      {s.label}
    </span>
  );
}
