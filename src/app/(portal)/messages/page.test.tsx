import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MessagesPage from "@/app/(portal)/messages/page";
import type { InboxItem } from "@/types/messaging";

const mocks = vi.hoisted(() => ({
  allowed: true,
  inbox: {} as Record<string, unknown>,
  markAll: vi.fn(),
  markRead: vi.fn(),
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (action: string) => action === "view:inbox" && mocks.allowed, isLoading: false }),
}));
vi.mock("@/hooks/useMessaging", () => ({
  DEFAULT_INBOX_FILTERS: { unreadOnly: false, severity: "all", type: "all" },
  useInbox: () => mocks.inbox,
  useInboxSummary: () => ({ data: { unread: 2, total: 3, max_unread_severity: "warning" } }),
  useMarkRead: () => ({ mutate: mocks.markRead }),
  useMarkAllRead: () => ({ mutate: mocks.markAll }),
}));

function item(id: string, created: Date, overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id,
    title: `Titolo ${id}`,
    body: `Corpo ${id}`,
    link: null,
    severity: "info",
    type: "it.pagopa.qa.nrt.reviews.pending",
    created_at: created.toISOString(),
    read_at: null,
    auto_read: false,
    ...overrides,
  };
}

function loaded(items: InboxItem[], extra: Record<string, unknown> = {}) {
  mocks.inbox = {
    data: { pages: [{ items, next_cursor: null }] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: mocks.fetchNextPage,
    refetch: mocks.refetch,
    ...extra,
  };
}

describe("MessagesPage", () => {
  beforeEach(() => {
    mocks.allowed = true;
    Object.values(mocks).forEach((value) => typeof value === "function" && "mockReset" in value && value.mockReset());
    loaded([]);
  });

  it("groups messages under Oggi and Ieri and summarises unread ones by severity", () => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0);
    loaded([
      item("1", now, { severity: "warning" }),
      item("2", now, { severity: "info" }),
      item("3", yesterday, { severity: "warning", read_at: yesterday.toISOString() }),
    ]);
    render(<MessagesPage />);

    expect(screen.getByRole("heading", { name: "Oggi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ieri" })).toBeInTheDocument();
    expect(screen.getAllByTestId("message-card")).toHaveLength(3);
    const chips = screen.getByTestId("severity-summary");
    expect(within(chips).getByText("2 non letti")).toBeInTheDocument();
    expect(within(chips).getByText("1 warning")).toBeInTheDocument();
    expect(within(chips).getByText("1 info")).toBeInTheDocument();
  });

  it("shows the friendly empty state when there are no messages", () => {
    render(<MessagesPage />);
    expect(screen.getByText("Nessun messaggio")).toBeInTheDocument();
    expect(screen.queryByTestId("message-card")).toBeNull();
  });

  it("shows skeletons while loading and a retry on error", () => {
    mocks.inbox = { data: undefined, isLoading: true, isError: false, hasNextPage: false };
    const { rerender } = render(<MessagesPage />);
    expect(screen.getAllByTestId("messages-skeleton").length).toBeGreaterThan(0);

    mocks.inbox = { data: undefined, isLoading: false, isError: true, hasNextPage: false, refetch: mocks.refetch };
    rerender(<MessagesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("loads more messages on request", () => {
    loaded([item("1", new Date())], { hasNextPage: true });
    render(<MessagesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Carica altri" }));
    expect(mocks.fetchNextPage).toHaveBeenCalled();
  });

  it("marks everything read", () => {
    loaded([item("1", new Date())]);
    render(<MessagesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Segna tutto come letto" }));
    expect(mocks.markAll).toHaveBeenCalled();
  });

  it("marks a single message read from its card", () => {
    loaded([item("7", new Date())]);
    render(<MessagesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Segna come letto" }));
    expect(mocks.markRead).toHaveBeenCalledWith("7");
  });

  it("tells a user without view:inbox that the page is not available to them", () => {
    mocks.allowed = false;
    render(<MessagesPage />);
    expect(screen.getByText(/non hai accesso/i)).toBeInTheDocument();
    expect(screen.queryByTestId("message-card")).toBeNull();
  });
});
