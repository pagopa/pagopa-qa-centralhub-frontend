import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessagePanel } from "@/components/messaging/MessagePanel";
import type { InboxItem } from "@/types/messaging";

const mocks = vi.hoisted(() => ({
  items: [] as unknown[],
  loading: false,
  failed: false,
  refetch: vi.fn(),
  unread: 0,
  markRead: vi.fn(),
  markAll: vi.fn(),
}));
vi.mock("@/hooks/useMessaging", () => ({
  DEFAULT_INBOX_FILTERS: { unreadOnly: false, severity: "all", type: "all" },
  useInbox: () => ({
    data: mocks.loading || mocks.failed ? undefined : { pages: [{ items: mocks.items, next_cursor: null }] },
    isLoading: mocks.loading,
    isError: mocks.failed,
    refetch: mocks.refetch,
  }),
  useInboxSummary: () => ({
    data: { unread: mocks.unread, total: mocks.items.length, max_unread_severity: null },
  }),
  useMarkRead: () => ({ mutate: mocks.markRead }),
  useMarkAllRead: () => ({ mutate: mocks.markAll }),
}));

function item(id: string, overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id,
    title: `Titolo ${id}`,
    body: `Corpo ${id}`,
    link: null,
    severity: "info",
    type: "it.pagopa.qa.nrt.reviews.pending",
    created_at: new Date().toISOString(),
    read_at: null,
    auto_read: false,
    ...overrides,
  };
}

describe("MessagePanel", () => {
  beforeEach(() => {
    mocks.items = [];
    mocks.loading = false;
    mocks.failed = false;
    mocks.refetch.mockReset();
    mocks.unread = 0;
    mocks.markRead.mockReset();
    mocks.markAll.mockReset();
  });

  it("shows a friendly empty state", () => {
    render(<MessagePanel />);
    expect(screen.getByText("Nessun messaggio")).toBeInTheDocument();
  });

  it("shows a skeleton, not the empty state, while the list is loading", () => {
    mocks.loading = true;
    mocks.unread = 3;
    render(<MessagePanel />);
    expect(screen.getAllByTestId("panel-skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByText("Nessun messaggio")).toBeNull();
  });

  it("shows an error with a retry, not the empty state, when the list fails to load", () => {
    mocks.failed = true;
    mocks.unread = 3;
    render(<MessagePanel />);
    expect(screen.getByText("Non è stato possibile caricare i messaggi.")).toBeInTheDocument();
    expect(screen.queryByText("Nessun messaggio")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("lists at most six messages and links to the full page", () => {
    mocks.items = Array.from({ length: 8 }, (_, i) => item(String(i + 1)));
    mocks.unread = 8;
    render(<MessagePanel />);
    expect(screen.getAllByTestId("panel-item")).toHaveLength(6);
    expect(screen.getByRole("link", { name: /Vedi tutti i messaggi/ })).toHaveAttribute("href", "/messages");
  });

  it("marks an unread message read and closes when its link is followed", () => {
    mocks.items = [item("1", { link: "/nrts" })];
    mocks.unread = 1;
    const onNavigate = vi.fn();
    render(<MessagePanel onNavigate={onNavigate} />);

    const link = screen.getByRole("link", { name: /Titolo 1/ });
    expect(link).toHaveAttribute("href", "/nrts");
    link.addEventListener("click", (event) => event.preventDefault()); // jsdom cannot navigate
    fireEvent.click(link);
    expect(mocks.markRead).toHaveBeenCalledWith("1");
    expect(onNavigate).toHaveBeenCalled();
  });

  it("does not mark a read message again", () => {
    mocks.items = [item("1", { link: "/nrts", read_at: "2026-11-22T09:00:00Z" })];
    render(<MessagePanel />);
    const link = screen.getByRole("link", { name: /Titolo 1/ });
    link.addEventListener("click", (event) => event.preventDefault()); // jsdom cannot navigate
    fireEvent.click(link);
    expect(mocks.markRead).not.toHaveBeenCalled();
  });

  it("renders no anchor for a message without link", () => {
    mocks.items = [item("1")];
    render(<MessagePanel />);
    expect(screen.queryByRole("link", { name: /Titolo 1/ })).toBeNull();
    expect(screen.getByText("Titolo 1")).toBeInTheDocument();
  });

  it("marks everything read, and the action is disabled at zero unread", () => {
    mocks.items = [item("1")];
    mocks.unread = 1;
    const { rerender } = render(<MessagePanel />);
    const button = screen.getByRole("button", { name: "Segna tutto come letto" });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(mocks.markAll).toHaveBeenCalled();

    mocks.unread = 0;
    rerender(<MessagePanel />);
    expect(screen.getByRole("button", { name: "Segna tutto come letto" })).toBeDisabled();
  });
});
