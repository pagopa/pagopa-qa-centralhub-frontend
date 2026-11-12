import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TasNrtsPage from "./page";

vi.mock("@/components/nrts/OriginNrtsPage", () => ({
  default: ({ origin, title }: { origin: string; title: string }) => (
    <h1 data-origin={origin}>{title}</h1>
  ),
}));

describe("TasNrtsPage", () => {
  it("is titled TAS (Test Automation Services)", () => {
    render(<TasNrtsPage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("TAS (Test Automation Services)");
    expect(heading).toHaveAttribute("data-origin", "TAS");
  });
});
