"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { SEVERITY_TINT } from "@/components/messaging/MessagePanel";
import { relativeTimeIt, typeMeta } from "@/lib/messaging";
import type { InboxItem, Severity } from "@/types/messaging";

const RAIL: Record<Severity, string> = {
  info: "var(--accent)",
  warning: "var(--warning)",
  critical: "var(--danger)",
};

const ABSOLUTE_TIME = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Rome",
});

export function MessageCard({
  item,
  onMarkRead,
}: {
  item: InboxItem;
  onMarkRead: (id: string) => void;
}) {
  const unread = item.read_at === null;
  const meta = typeMeta(item.type);
  const Icon = meta.icon;
  const tint = SEVERITY_TINT[item.severity];

  return (
    <article
      data-testid="message-card"
      data-unread={String(unread)}
      style={{
        position: "relative",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        padding: "14px 16px 14px 18px",
        marginBottom: 10,
        overflow: "hidden",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        opacity: unread ? 1 : 0.82,
        transition: "box-shadow 0.15s, transform 0.15s",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow = "var(--shadow-md)";
        event.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = "var(--shadow-sm)";
        event.currentTarget.style.transform = "none";
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: RAIL[item.severity],
          opacity: unread ? 1 : 0.35,
        }}
      />
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          background: tint.bg,
          color: tint.fg,
        }}
      >
        <Icon size={17} strokeWidth={1.7} aria-hidden />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {unread && (
            <span
              data-testid="unread-dot"
              aria-label="Non letto"
              style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }}
            />
          )}
          <h3
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: unread ? 700 : 500,
              color: unread ? "var(--text)" : "var(--text-dim)",
            }}
          >
            {item.title}
          </h3>
        </div>
        <p style={{ margin: "3px 0 10px", color: "var(--text-dim)", fontSize: 14 }}>{item.body}</p>
        {item.auto_read && (
          <p style={{ margin: "0 0 8px", fontSize: 12, fontStyle: "italic", color: "var(--text-muted)" }}>
            Sostituito da un avviso più recente
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text-muted)" }}>
          <span
            style={{
              background: "var(--subtle)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              padding: "1px 8px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-dim)",
            }}
          >
            {meta.label}
          </span>
          <time dateTime={item.created_at} title={ABSOLUTE_TIME.format(new Date(item.created_at))}>
            {relativeTimeIt(item.created_at)}
          </time>
        </div>
      </div>

      {!item.auto_read && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {item.link && (
            <Link
              href={item.link}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: 12.5,
                fontWeight: 600,
                textDecoration: "none",
                whiteSpace: "nowrap",
                background: unread ? "var(--accent)" : "var(--subtle)",
                color: unread ? "var(--accent-fg, #fff)" : "var(--text-dim)",
                border: unread ? "none" : "1px solid var(--border-strong)",
              }}
            >
              {meta.cta}
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
          {unread && (
            <button
              type="button"
              onClick={() => onMarkRead(item.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: "none",
                background: "none",
                padding: "2px 0",
                fontSize: 12,
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <Check size={14} aria-hidden />
              Segna come letto
            </button>
          )}
        </div>
      )}
    </article>
  );
}
