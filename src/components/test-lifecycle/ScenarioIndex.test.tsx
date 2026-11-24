import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScenarioIndex } from "./ScenarioIndex";

const ITEMS = [
  { id: "a", number: 1, title: "Primo", errors: 0 },
  { id: "b", number: 2, title: "Secondo", errors: 2 },
];

describe("ScenarioIndex", () => {
  it("lists scenarios and reports the selected id", async () => {
    const onSelect = vi.fn();
    render(<ScenarioIndex items={ITEMS} onSelect={onSelect} />);
    expect(screen.getByRole("navigation", { name: "Indice scenari" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /#2 Secondo/ }));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("marks scenarios with errors", () => {
    render(<ScenarioIndex items={ITEMS} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /#2 Secondo/ })).toHaveTextContent("2 errori");
    expect(screen.getByRole("button", { name: /#1 Primo/ })).not.toHaveTextContent("errori");
  });
});
