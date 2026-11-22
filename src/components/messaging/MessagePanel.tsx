"use client";

import Link from "next/link";
import {
  DEFAULT_INBOX_FILTERS,
  useInbox,
  useInboxSummary,
  useMarkAllRead,
  useMarkRead,
} from "@/hooks/useMessaging";
import { relativeTimeIt, typeMeta } from "@/lib/messaging";
import type { InboxItem, Severity } from "@/types/messaging";

const PANEL_ITEMS = 6;

export const SEVERITY_TINT: Record<Severity, { bg: string; fg: string }> = {
  info: { bg: "var(--info-soft)", fg: "var(--info)" },
  warning: { bg: "var(--warning-soft)", fg: "var(--warning-ink)" },
  critical: { bg: "var(--danger-soft)", fg: "var(--danger)" },
};

function PanelRow({ item, onOpen }: { item: InboxItem; onOpen: () => void }) {
  const unread = item.read_at === null;
  const meta = typeMeta(item.type);
  const Icon = meta.icon;
  const tint = SEVERITY_TINT[item.severity];
  const content = (
    <div
      data-testid="panel-item"
      style={{
        display: "flex",
        gap: 10,
        padding: "11px 14px",
        borderBottom: "1px solid var(--border)",
        background: unread ? "color-mix(in oklab, var(--accent-soft) 45%, transparent)" : "transparent",
      }}
    >
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
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.3,
            fontWeight: unread ? 600 : 500,
            color: unread ? "var(--text)" : "var(--text-dim)",
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.body}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
          {relativeTimeIt(item.created_at)}
        </div>
      </div>
    </div>
  );

  if (!item.link) {
    return (
      <div role="presentation" onClick={onOpen} style={{ cursor: unread ? "pointer" : "default" }}>
        {content}
      </div>
    );
  }
  return (
    <Link href={item.link} onClick={onOpen} style={{ display: "block", color: "inherit", textDecoration: "none" }}>
      {content}
    </Link>
  );
}

export function MessagePanel({ onNavigate }: { onNavigate?: () => void }) {
  const inbox = useInbox(DEFAULT_INBOX_FILTERS);
  const summary = useInboxSummary();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const items = (inbox.data?.pages.flatMap((page) => page.items) ?? []).slice(0, PANEL_ITEMS);
  const unread = summary.data?.unread ?? 0;

  function open(item: InboxItem) {
    if (item.read_at === null) markRead.mutate(item.id);
    onNavigate?.();
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <b style={{ flex: 1, fontSize: 14 }}>Messaggi</b>
        <button
          type="button"
          disabled={unread === 0}
          onClick={() => markAll.mutate()}
          style={{
            border: "none",
            background: "none",
            padding: 0,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--accent)",
            cursor: unread === 0 ? "default" : "pointer",
            opacity: unread === 0 ? 0.45 : 1,
          }}
        >
          Segna tutto come letto
        </button>
      </div>
      {inbox.isLoading ? (
        [0, 1, 2].map((key) => (
          <div
            key={key}
            data-testid="panel-skeleton"
            className="animate-pulse"
            style={{ height: 58, margin: "8px 14px", borderRadius: "var(--radius-sm)", background: "var(--subtle)" }}
          />
        ))
      ) : inbox.isError ? (
        <div style={{ padding: "22px 14px", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
          <p style={{ margin: "0 0 8px" }}>Non è stato possibile caricare i messaggi.</p>
          <button
            type="button"
            onClick={() => inbox.refetch()}
            style={{
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              color: "var(--text)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 12px",
              cursor: "pointer",
            }}
          >
            Riprova
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: "28px 14px", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
          Nessun messaggio
        </div>
      ) : (
        items.map((item) => <PanelRow key={item.id} item={item} onOpen={() => open(item)} />)
      )}
      <div style={{ padding: "10px 14px", textAlign: "center", background: "var(--subtle)" }}>
        <Link
          href="/messages"
          onClick={onNavigate}
          style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
        >
          Vedi tutti i messaggi →
        </Link>
      </div>
    </div>
  );
}
