import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageFilters } from "@/components/messaging/MessageFilters";
import { DEFAULT_INBOX_FILTERS } from "@/hooks/useMessaging";

const QG = "it.pagopa.qa.quality_gate.run.completed";

describe("MessageFilters", () => {
  it("switches between all messages and unread ones, showing the unread count", () => {
    const onChange = vi.fn();
    render(<MessageFilters value={DEFAULT_INBOX_FILTERS} onChange={onChange} unreadCount={3} />);

    fireEvent.click(screen.getByRole("button", { name: "Non letti · 3" }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_INBOX_FILTERS, unreadOnly: true });
    fireEvent.click(screen.getByRole("button", { name: "Tutti" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_INBOX_FILTERS, unreadOnly: false });
  });

  it("filters by severity", () => {
    const onChange = vi.fn();
    render(<MessageFilters value={DEFAULT_INBOX_FILTERS} onChange={onChange} unreadCount={0} />);
    expect(screen.getByRole("button", { name: "Tutte le severità" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Warning" }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_INBOX_FILTERS, severity: "warning" });
    fireEvent.click(screen.getByRole("button", { name: "Critical" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_INBOX_FILTERS, severity: "critical" });
  });

  it("filters by type and toggles the active type off", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MessageFilters value={DEFAULT_INBOX_FILTERS} onChange={onChange} unreadCount={0} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quality Gate" }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_INBOX_FILTERS, type: QG });

    rerender(
      <MessageFilters value={{ ...DEFAULT_INBOX_FILTERS, type: QG }} onChange={onChange} unreadCount={0} />,
    );
    expect(screen.getByRole("button", { name: "Quality Gate" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Quality Gate" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_INBOX_FILTERS, type: "all" });
  });
});
