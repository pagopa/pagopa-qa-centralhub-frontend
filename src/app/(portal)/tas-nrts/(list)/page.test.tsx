import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TasNrtsPage from "./page";

const mocks = vi.hoisted(() => ({ can: vi.fn(), suites: vi.fn() }));

vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock("@/hooks/useSuites", () => ({ useSuites: (...args: unknown[]) => mocks.suites(...args) }));
vi.mock("@/components/nrts/TestRunLaunchPanel", () => ({
  TestRunLaunchPanel: ({ origin, suites }: { origin: string; suites: string[] }) => (
    <div data-testid="launch" data-origin={origin}>{suites.join(",")}</div>
  ),
}));
vi.mock("@/components/nrts/OriginNrtsPage", () => ({
  default: ({ origin, title, children }: { origin: string; title: string; children?: ReactNode }) => (
    <div>
      <h1 data-origin={origin}>{title}</h1>
      {children}
    </div>
  ),
}));

describe("TasNrtsPage", () => {
  beforeEach(() => {
    mocks.can.mockReset().mockReturnValue(true);
    mocks.suites.mockReset().mockReturnValue({ data: ["checkout"] });
  });

  it("is titled TAS (Test Automation Services)", () => {
    render(<TasNrtsPage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("TAS (Test Automation Services)");
    expect(heading).toHaveAttribute("data-origin", "TAS");
  });

  it("offers the TAS launch panel with the suites that already have TAS runs", () => {
    render(<TasNrtsPage />);
    expect(screen.getByTestId("launch")).toHaveAttribute("data-origin", "TAS");
    expect(screen.getByTestId("launch")).toHaveTextContent("checkout");
    expect(mocks.suites).toHaveBeenCalledWith({ origin: "TAS" });
    expect(mocks.can).toHaveBeenCalledWith("run:tas");
  });

  it("hides the launch panel without the run:tas permission", () => {
    mocks.can.mockReturnValue(false);
    render(<TasNrtsPage />);
    expect(screen.queryByTestId("launch")).not.toBeInTheDocument();
  });
});
