"use client";

import { Bell, Check } from "lucide-react";
import { useState } from "react";
import { MessagePanel } from "@/components/messaging/MessagePanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useInboxSummary } from "@/hooks/useMessaging";
import { usePermissions } from "@/hooks/usePermissions";
import { bellLabel, bellState, bellTone, formatBadge } from "@/lib/messaging";
import type { Severity } from "@/types/messaging";

// Each solid badge is paired with its own text token, so the count stays legible in both themes
// (the solid colours get lighter in dark mode, where white text would not have enough contrast).
const TONE: Record<Severity, { bg: string; fg: string; badge: string; badgeFg: string }> = {
  info: { bg: "var(--accent-soft)", fg: "var(--accent)", badge: "var(--accent)", badgeFg: "var(--accent-fg)" },
  warning: { bg: "var(--warning-soft)", fg: "var(--warning-ink)", badge: "var(--warning)", badgeFg: "var(--warning-fg)" },
  critical: { bg: "var(--danger-soft)", fg: "var(--danger)", badge: "var(--danger)", badgeFg: "var(--danger-fg)" },
};

export function NotificationBell() {
  const { can } = usePermissions();
  const { data: summary } = useInboxSummary();
  const [open, setOpen] = useState(false);

  if (!can("view:inbox")) return null;

  const state = bellState(summary);
  const tone = bellTone(summary?.max_unread_severity ?? null);
  const colors = TONE[tone];
  const unread = state === "unread";
  const label = bellLabel(summary);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        title={label}
        data-state={state}
        data-tone={tone}
        className={unread ? "bell-ring" : undefined}
        style={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "none",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          background: unread ? colors.bg : "transparent",
          color: unread ? colors.fg : state === "read" ? "var(--text-dim)" : "var(--text-muted)",
          opacity: state === "empty" || state === "unknown" ? 0.85 : 1,
          transition: "background 0.15s, color 0.15s",
        }}
      >
        <Bell size={18} strokeWidth={1.7} aria-hidden />
        {state === "read" && (
          <span
            data-testid="bell-check"
            aria-hidden
            style={{
              position: "absolute",
              right: 1,
              bottom: 2,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "var(--success)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              border: "2px solid var(--surface)",
              boxSizing: "content-box",
            }}
          >
            <Check size={9} strokeWidth={3} />
          </span>
        )}
        {unread && summary && (
          <span
            data-testid="bell-badge"
            aria-hidden
            style={{
              position: "absolute",
              top: -3,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 9,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
              color: colors.badgeFg,
              background: colors.badge,
              display: "grid",
              placeItems: "center",
              border: "2px solid var(--surface)",
              boxSizing: "content-box",
            }}
          >
            {formatBadge(summary.unread)}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] gap-0 overflow-hidden p-0">
        <MessagePanel onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
