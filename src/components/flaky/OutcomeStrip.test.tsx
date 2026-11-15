import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OutcomeStrip } from "./OutcomeStrip";

const outcomes = [
  { run_id: "r1", ts: "2026-11-10T10:00:00Z", outcome: "P" as const },
  { run_id: "r2", ts: "2026-11-11T10:00:00Z", outcome: "R" as const },
  { run_id: "r3", ts: "2026-11-12T10:00:00Z", outcome: "F" as const },
];

describe("OutcomeStrip", () => {
  it("pads to 30 cells and colors the last ones oldest to newest", () => {
    render(<OutcomeStrip outcomes={outcomes} />);
    const cells = screen.getByRole("list", { name: "Ultime run" }).querySelectorAll("li");
    expect(cells).toHaveLength(30);
    expect([...cells].slice(-3).map((c) => c.getAttribute("data-outcome"))).toEqual(["P", "R", "F"]);
    expect(cells[0].getAttribute("data-outcome")).toBe("none");
    expect(cells[29]).toHaveAttribute("title", expect.stringContaining("fallito"));
    expect(cells[28]).toHaveAttribute("title", expect.stringContaining("passato dopo retry"));
  });

  it("keeps only the newest cells when there are more outcomes than the size", () => {
    render(<OutcomeStrip outcomes={outcomes} size={2} />);
    const cells = screen.getByRole("list", { name: "Ultime run" }).querySelectorAll("li");
    expect([...cells].map((c) => c.getAttribute("data-outcome"))).toEqual(["R", "F"]);
  });
});
