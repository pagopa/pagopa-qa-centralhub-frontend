"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { MessageCard } from "@/components/messaging/MessageCard";
import { MessageFilters } from "@/components/messaging/MessageFilters";
import { MessagesEmptyState } from "@/components/messaging/MessagesEmptyState";
import {
  DEFAULT_INBOX_FILTERS,
  useInbox,
  useInboxSummary,
  useMarkAllRead,
  useMarkRead,
  type InboxFilters,
} from "@/hooks/useMessaging";
import { usePermissions } from "@/hooks/usePermissions";
import { groupByDay, severityCounts } from "@/lib/messaging";

function SummaryChip({ dot, children }: { dot: string; children: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 99,
        padding: "4px 11px",
        fontSize: 12,
        fontWeight: 600,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text-dim)",
      }}
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />
      {children}
    </span>
  );
}

export default function MessagesPage() {
  const { can } = usePermissions();
  const [filters, setFilters] = useState<InboxFilters>(DEFAULT_INBOX_FILTERS);
  const inbox = useInbox(filters);
  const summary = useInboxSummary();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  if (!can("view:inbox")) {
    return <p style={{ color: "var(--text-dim)" }}>Non hai accesso a questa sezione.</p>;
  }

  const items = inbox.data?.pages.flatMap((page) => page.items) ?? [];
  const counts = severityCounts(items);
  const unreadLoaded = counts.info + counts.warning + counts.critical;
  const unreadTotal = summary.data?.unread ?? 0;
  const filtered =
    filters.unreadOnly || filters.severity !== "all" || filters.type !== "all";

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Messaggi</h1>
          <p style={{ margin: "2px 0 0", color: "var(--text-dim)", fontSize: 13 }}>
            Avvisi e aggiornamenti dai sistemi QA, filtrati per il tuo ruolo.
          </p>
        </div>
        <button
          type="button"
          disabled={unreadTotal === 0}
          onClick={() => markAll.mutate()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            border: "none",
            background: "none",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--accent)",
            cursor: unreadTotal === 0 ? "default" : "pointer",
            opacity: unreadTotal === 0 ? 0.45 : 1,
          }}
        >
          <Check size={14} aria-hidden />
          Segna tutto come letto
        </button>
      </div>

      <div data-testid="severity-summary" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <SummaryChip dot="var(--text-muted)">{`${unreadLoaded} non letti`}</SummaryChip>
        {counts.critical > 0 && <SummaryChip dot="var(--danger)">{`${counts.critical} critical`}</SummaryChip>}
        {counts.warning > 0 && <SummaryChip dot="var(--warning-strong)">{`${counts.warning} warning`}</SummaryChip>}
        {counts.info > 0 && <SummaryChip dot="var(--accent)">{`${counts.info} info`}</SummaryChip>}
      </div>

      <MessageFilters value={filters} onChange={setFilters} unreadCount={unreadTotal} />

      {inbox.isLoading ? (
        <div style={{ marginTop: 20 }}>
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              data-testid="messages-skeleton"
              className="animate-pulse"
              style={{
                height: 92,
                marginBottom: 10,
                borderRadius: "var(--radius-lg)",
                background: "var(--subtle)",
                border: "1px solid var(--border)",
              }}
            />
          ))}
        </div>
      ) : inbox.isError ? (
        <div style={{ marginTop: 22, textAlign: "center", color: "var(--text-dim)" }}>
          <p>Non è stato possibile caricare i messaggi.</p>
          <button
            type="button"
            onClick={() => inbox.refetch()}
            style={{
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 14px",
              cursor: "pointer",
              color: "var(--text)",
            }}
          >
            Riprova
          </button>
        </div>
      ) : items.length === 0 ? (
        <MessagesEmptyState filtered={filtered} />
      ) : (
        <>
          {groupByDay(items, new Date()).map((group) => (
            <section key={group.label}>
              <h2
                style={{
                  margin: "20px 0 8px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {group.label}
              </h2>
              {group.items.map((item) => (
                <MessageCard key={item.id} item={item} onMarkRead={(id) => markRead.mutate(id)} />
              ))}
            </section>
          ))}
          {inbox.hasNextPage && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button
                type="button"
                disabled={inbox.isFetchingNextPage}
                onClick={() => inbox.fetchNextPage()}
                style={{
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 16px",
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                Carica altri
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
