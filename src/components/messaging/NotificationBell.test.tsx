import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/components/messaging/NotificationBell";
import type { InboxSummary } from "@/types/messaging";

vi.mock("@/components/ui/popover", () => import("@/test/popover-mock"));

const mocks = vi.hoisted(() => ({ summary: undefined as unknown, allowed: true }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (action: string) => action === "view:inbox" && mocks.allowed }),
}));
vi.mock("@/hooks/useMessaging", () => ({
  DEFAULT_INBOX_FILTERS: { unreadOnly: false, severity: "all", type: "all" },
  useInboxSummary: () => ({ data: mocks.summary }),
  useInbox: () => ({ data: { pages: [{ items: [], next_cursor: null }] }, isLoading: false }),
  useMarkRead: () => ({ mutate: vi.fn() }),
  useMarkAllRead: () => ({ mutate: vi.fn() }),
}));

function renderBell(summary: InboxSummary | undefined) {
  mocks.summary = summary;
  render(<NotificationBell />);
  return screen.getByRole("button");
}

describe("NotificationBell", () => {
  beforeEach(() => {
    mocks.allowed = true;
    mocks.summary = undefined;
  });

  it("shows a muted bell with no decoration when there are no messages", () => {
    const bell = renderBell({ unread: 0, total: 0, max_unread_severity: null });
    expect(bell).toHaveAttribute("data-state", "empty");
    expect(bell).toHaveAccessibleName("Nessun messaggio");
    expect(screen.queryByTestId("bell-badge")).toBeNull();
    expect(screen.queryByTestId("bell-check")).toBeNull();
    expect(bell).not.toHaveClass("bell-ring");
  });

  it("shows a check mark when every message has been read", () => {
    const bell = renderBell({ unread: 0, total: 3, max_unread_severity: null });
    expect(bell).toHaveAttribute("data-state", "read");
    expect(bell).toHaveAccessibleName("Tutti i messaggi sono stati letti");
    expect(screen.getByTestId("bell-check")).toBeInTheDocument();
    expect(screen.queryByTestId("bell-badge")).toBeNull();
    expect(bell).not.toHaveClass("bell-ring");
  });

  it("shows the counter, the severity tone and the ring when there are unread messages", () => {
    const bell = renderBell({ unread: 3, total: 5, max_unread_severity: "warning" });
    expect(bell).toHaveAttribute("data-state", "unread");
    expect(bell).toHaveAttribute("data-tone", "warning");
    expect(bell).toHaveAccessibleName("3 messaggi non letti");
    expect(screen.getByTestId("bell-badge")).toHaveTextContent("3");
    expect(bell).toHaveClass("bell-ring");
    expect(screen.queryByTestId("bell-check")).toBeNull();
  });

  it("caps the counter at 9+ and follows the most severe unread message", () => {
    const bell = renderBell({ unread: 12, total: 12, max_unread_severity: "critical" });
    expect(bell).toHaveAttribute("data-tone", "critical");
    expect(screen.getByTestId("bell-badge")).toHaveTextContent("9+");
  });

  it("is neutral, never 'all read', while the summary is not available", () => {
    const bell = renderBell(undefined);
    expect(bell).toHaveAttribute("data-state", "unknown");
    expect(bell).toHaveAccessibleName("Messaggi");
    expect(screen.queryByTestId("bell-check")).toBeNull();
    expect(screen.queryByTestId("bell-badge")).toBeNull();
  });

  it("renders nothing without the view:inbox permission", () => {
    mocks.allowed = false;
    mocks.summary = { unread: 1, total: 1, max_unread_severity: "info" };
    const { container } = render(<NotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["info", "var(--accent)", "var(--accent-fg)"],
    ["warning", "var(--warning)", "var(--warning-fg)"],
    ["critical", "var(--danger)", "var(--danger-fg)"],
  ] as const)("keeps the %s badge legible in both themes by pairing it with its own text token", (severity, bg, fg) => {
    renderBell({ unread: 2, total: 2, max_unread_severity: severity });
    const style = screen.getByTestId("bell-badge").getAttribute("style") ?? "";
    expect(style).toContain(`background: ${bg}`);
    expect(style).toContain(`color: ${fg}`);
  });
});
