import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExtraTagsPicker } from "./ExtraTagsPicker";

describe("ExtraTagsPicker", () => {
  it("shows backend category tags and tags already on the scenario", () => {
    render(<ExtraTagsPicker value={["legacy"]} readOnly={false} onToggle={vi.fn()} options={["e2e", "regression"]} />);
    expect(screen.getByText("@regression")).toBeInTheDocument();
    expect(screen.getByText("@legacy")).toBeInTheDocument();
    expect(screen.queryByText("@runnable")).toBeNull();
  });

  it("falls back to the base tags", () => {
    render(<ExtraTagsPicker value={[]} readOnly onToggle={vi.fn()} />);
    expect(screen.getByText("@runnable")).toBeInTheDocument();
  });
});
