import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FlakyHintBoxes } from "./FlakyHintBoxes";

const summary = { to_mark: 7, to_unmark: 4, broken: 2, flagged: 23, analyzed: 412 };

describe("FlakyHintBoxes", () => {
  it("shows the three hints and the flagged total with their counts", () => {
    render(<FlakyHintBoxes summary={summary} active={null} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Da marcare\s*7/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Da smarcare\s*4/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rotti\s*2/ })).toBeInTheDocument();
    expect(screen.getByText("Marcati flaky")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("su 412 scenari analizzati")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Marcati flaky/ })).not.toBeInTheDocument();
  });

  it("toggles a hint filter and marks the active one", async () => {
    const onToggle = vi.fn();
    render(<FlakyHintBoxes summary={summary} active="to_unmark" onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: /Da smarcare/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Da marcare/ })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: /Rotti/ }));
    expect(onToggle).toHaveBeenCalledWith("broken");
  });

  it("shows zeros while the summary is loading", () => {
    render(<FlakyHintBoxes summary={undefined} active={null} onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Da marcare\s*0/ })).toBeInTheDocument();
  });
});
