import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlakinessLevel } from "./FlakinessLevel";

describe("FlakinessLevel", () => {
  it("fills as many of the 5 segments as the level, in the level color", () => {
    render(<FlakinessLevel level={3} score={22} state="OK" />);
    const indicator = screen.getByRole("img", { name: "Flakiness livello 3 su 5, punteggio 22" });
    const segments = indicator.querySelectorAll("[data-segment]");
    expect(segments).toHaveLength(5);
    expect([...segments].map((s) => s.getAttribute("data-filled"))).toEqual(["true", "true", "true", "false", "false"]);
    expect((segments[0] as HTMLElement).style.background).toBe("var(--flaky-l3)");
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
  });

  it("shows broken scenarios as Rotto", () => {
    render(<FlakinessLevel level={1} score={4} state="BROKEN" />);
    expect(screen.getByText("Rotto")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows scenarios without enough runs as Dati insuff.", () => {
    render(<FlakinessLevel level={null} score={null} state="INSUFFICIENT_DATA" />);
    expect(screen.getByText("Dati insuff.")).toBeInTheDocument();
  });
});
