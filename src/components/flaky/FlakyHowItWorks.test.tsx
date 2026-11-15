import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlakyHowItWorks, FlakyHowItWorksContent } from "./FlakyHowItWorks";

describe("FlakyHowItWorks", () => {
  it("offers the explanation behind a 'Come si calcola' button", () => {
    render(<FlakyHowItWorks />);
    expect(screen.getByRole("button", { name: "Come si calcola" })).toBeInTheDocument();
  });

  it("explains signals, window, levels and hints", () => {
    const { container } = render(<FlakyHowItWorksContent />);
    const text = container.textContent ?? "";
    for (const expected of ["CRON", "MANUAL", "30 giorni", "30 run", "14 giorni", "Flip rate", "Pass on retry", "5 / 15 / 30 / 50", "Da marcare", "Da smarcare", "Rotto"]) {
      expect(text).toContain(expected);
    }
  });
});
