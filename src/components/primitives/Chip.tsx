type RunStatus = "passed" | "failed" | "flaky" | "skipped" | "running" | "todo" | "inprogress" | "done" | "blocked" | "mixed";
type Priority = "p1" | "p2" | "p3" | "p4";

type ChipProps =
  | { variant: "status"; value: RunStatus; label?: string }
  | { variant: "priority"; value: Priority; label?: string };

const STATUS_STYLE: Record<RunStatus, { color: string; bg: string; dot: string }> = {
  passed:     { color: "var(--success)",       bg: "var(--success-soft)",    dot: "var(--success)" },
  failed:     { color: "var(--danger)",        bg: "var(--danger-soft)",     dot: "var(--danger)" },
  flaky:      { color: "var(--warning)",       bg: "var(--warning-soft)",    dot: "var(--warning)" },
  skipped:    { color: "var(--text-muted)",    bg: "var(--neutral-soft)",    dot: "var(--text-muted)" },
  running:    { color: "var(--info)",          bg: "var(--info-soft)",       dot: "var(--info)" },
  todo:       { color: "var(--text-muted)",    bg: "var(--neutral-soft)",    dot: "var(--text-muted)" },
  inprogress: { color: "var(--info)",          bg: "var(--info-soft)",       dot: "var(--info)" },
  done:       { color: "var(--success)",       bg: "var(--success-soft)",    dot: "var(--success)" },
  blocked:    { color: "var(--danger)",        bg: "var(--danger-soft)",     dot: "var(--danger)" },
  mixed:      { color: "var(--warning)",       bg: "var(--warning-soft)",    dot: "var(--warning)" },
};

const PRIORITY_STYLE: Record<Priority, { color: string; bg: string }> = {
  p1: { color: "var(--danger)",    bg: "var(--danger-soft)" },
  p2: { color: "var(--warning)",   bg: "var(--warning-soft)" },
  p3: { color: "var(--info)",      bg: "var(--info-soft)" },
  p4: { color: "var(--text-muted)", bg: "var(--neutral-soft)" },
};

export function Chip(props: ChipProps) {
  if (props.variant === "status") {
    const s = STATUS_STYLE[props.value];
    return (
      <span
        className="inline-flex items-center gap-[5px] font-mono rounded-full"
        style={{ fontSize: 11, padding: "2px 8px", color: s.color, background: s.bg }}
      >
        <span
          className="inline-block rounded-full shrink-0"
          style={{ width: 6, height: 6, background: s.dot }}
        />
        {props.label ?? props.value}
      </span>
    );
  }

  const s = PRIORITY_STYLE[props.value];
  return (
    <span
      className="inline-flex items-center font-mono rounded-full uppercase"
      style={{ fontSize: 11, padding: "2px 8px", color: s.color, background: s.bg, fontWeight: 600, letterSpacing: ".04em" }}
    >
      {props.value.toUpperCase()}
    </span>
  );
}
