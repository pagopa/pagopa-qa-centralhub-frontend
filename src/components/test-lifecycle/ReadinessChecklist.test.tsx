import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadinessChecklist } from "./ReadinessChecklist";

describe("ReadinessChecklist", () => {
  it("lists each reason with a counter", () => {
    render(<ReadinessChecklist action="submit" reasons={["Nessuno scenario", "Reviewer non assegnato"]} />);
    expect(screen.getByText("Prima di inviare in review")).toBeInTheDocument();
    expect(screen.getByText("Nessuno scenario")).toBeInTheDocument();
    expect(screen.getByText("Reviewer non assegnato")).toBeInTheDocument();
    expect(screen.getByText("2 da risolvere")).toBeInTheDocument();
  });

  it("shows the ready state when there are no reasons", () => {
    render(<ReadinessChecklist action="submit" reasons={[]} />);
    expect(screen.getByText("Pronta per l'invio in review")).toBeInTheDocument();
    expect(screen.queryByText(/da risolvere/)).not.toBeInTheDocument();
  });

  it("uses the approval wording in review", () => {
    const { rerender } = render(<ReadinessChecklist action="approve" reasons={["Manca il reviewer"]} />);
    expect(screen.getByText("Prima di approvare")).toBeInTheDocument();
    rerender(<ReadinessChecklist action="approve" reasons={[]} />);
    expect(screen.getByText("Pronta per l'approvazione")).toBeInTheDocument();
  });
});
