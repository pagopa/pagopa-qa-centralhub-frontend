import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageCard } from "@/components/messaging/MessageCard";
import type { InboxItem } from "@/types/messaging";

function item(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "m1",
    title: "Quality Gate non superato · pagopa-fdr / integration",
    body: "12 scenari su 148 non superati.",
    link: "/quality-gate/report/r-1",
    severity: "warning",
    type: "it.pagopa.qa.quality_gate.run.completed",
    created_at: new Date().toISOString(),
    read_at: null,
    auto_read: false,
    ...overrides,
  };
}

describe("MessageCard", () => {
  it("marks an unread message with a dot and offers to mark it read", () => {
    const onMarkRead = vi.fn();
    render(<MessageCard item={item()} onMarkRead={onMarkRead} />);

    expect(screen.getByTestId("message-card")).toHaveAttribute("data-unread", "true");
    expect(screen.getByTestId("unread-dot")).toBeInTheDocument();
    expect(screen.getByText("Quality Gate")).toBeInTheDocument(); // type tag
    fireEvent.click(screen.getByRole("button", { name: "Segna come letto" }));
    expect(onMarkRead).toHaveBeenCalledWith("m1");
  });

  it("links to the section with the label of its type", () => {
    render(<MessageCard item={item()} onMarkRead={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Apri report" })).toHaveAttribute(
      "href",
      "/quality-gate/report/r-1",
    );
  });

  it("uses the generic label for an unknown type and omits the button without a link", () => {
    const { rerender } = render(
      <MessageCard item={item({ type: "other.type", link: "/x" })} onMarkRead={vi.fn()} />,
    );
    expect(screen.getByRole("link", { name: "Apri" })).toHaveAttribute("href", "/x");
    expect(screen.getByText("Sistema")).toBeInTheDocument();

    rerender(<MessageCard item={item({ link: null })} onMarkRead={vi.fn()} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("softens a read message: no dot and no mark-read action", () => {
    render(<MessageCard item={item({ read_at: "2026-11-22T09:00:00Z" })} onMarkRead={vi.fn()} />);
    expect(screen.getByTestId("message-card")).toHaveAttribute("data-unread", "false");
    expect(screen.queryByTestId("unread-dot")).toBeNull();
    expect(screen.queryByRole("button", { name: "Segna come letto" })).toBeNull();
  });

  it("explains an automatically read message and shows no actions", () => {
    render(
      <MessageCard
        item={item({ read_at: "2026-11-22T09:00:00Z", auto_read: true })}
        onMarkRead={vi.fn()}
      />,
    );
    expect(screen.getByText("Sostituito da un avviso più recente")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
