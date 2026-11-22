"use client";

import type { InboxFilters } from "@/hooks/useMessaging";
import type { Severity } from "@/types/messaging";

const SEVERITIES: { value: Severity | "all"; label: string }[] = [
  { value: "all", label: "Tutte le severità" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
  { value: "critical", label: "Critical" },
];

const TYPES: { value: string; label: string }[] = [
  { value: "it.pagopa.qa.quality_gate.run.completed", label: "Quality Gate" },
  { value: "it.pagopa.qa.nrt.reviews.pending", label: "NRT" },
  { value: "it.pagopa.qa.sanp_health.checks.failing", label: "SANP Health" },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        border: active ? "1px solid transparent" : "1px solid var(--border-strong)",
        background: active ? "var(--accent-soft)" : "var(--surface)",
        color: active ? "var(--accent)" : "var(--text-dim)",
        fontWeight: active ? 600 : 400,
        borderRadius: 99,
        padding: "4px 11px",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function MessageFilters({
  value,
  onChange,
  unreadCount,
}: {
  value: InboxFilters;
  onChange: (next: InboxFilters) => void;
  unreadCount: number;
}) {
  const divider = <span aria-hidden style={{ width: 1, height: 20, background: "var(--border-strong)" }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
      <div
        style={{
          display: "inline-flex",
          background: "var(--subtle)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: 2,
        }}
      >
        {[
          { unreadOnly: false, label: "Tutti" },
          { unreadOnly: true, label: `Non letti · ${unreadCount}` },
        ].map((segment) => {
          const active = value.unreadOnly === segment.unreadOnly;
          return (
            <button
              key={segment.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...value, unreadOnly: segment.unreadOnly })}
              style={{
                border: "none",
                padding: "5px 14px",
                borderRadius: 5,
                fontSize: 13,
                cursor: "pointer",
                background: active ? "var(--surface)" : "transparent",
                color: active ? "var(--text)" : "var(--text-dim)",
                fontWeight: active ? 600 : 400,
                boxShadow: active ? "var(--shadow-sm)" : "none",
              }}
            >
              {segment.label}
            </button>
          );
        })}
      </div>
      {divider}
      {SEVERITIES.map((severity) => (
        <Chip
          key={severity.value}
          active={value.severity === severity.value}
          onClick={() => onChange({ ...value, severity: severity.value })}
        >
          {severity.label}
        </Chip>
      ))}
      {divider}
      {TYPES.map((type) => (
        <Chip
          key={type.value}
          active={value.type === type.value}
          onClick={() => onChange({ ...value, type: value.type === type.value ? "all" : type.value })}
        >
          {type.label}
        </Chip>
      ))}
    </div>
  );
}
