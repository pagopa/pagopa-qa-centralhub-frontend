import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NrtsPage from "./page";

const mocks = vi.hoisted(() => ({ can: vi.fn() }));

vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock("@/components/nrts/NrtLaunchPanel", () => ({ NrtLaunchPanel: () => <div data-testid="launch" /> }));
vi.mock("@/components/nrts/OriginNrtsPage", () => ({
  default: ({ origin, title, children }: { origin: string; title: string; children?: ReactNode }) => (
    <div>
      <h1 data-origin={origin}>{title}</h1>
      {children}
    </div>
  ),
}));

describe("NrtsPage", () => {
  beforeEach(() => mocks.can.mockReset().mockReturnValue(true));

  it("is the NRT list with its usual title", () => {
    render(<NrtsPage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("NRTs (Non-Regression Test)");
    expect(heading).toHaveAttribute("data-origin", "NRT");
  });

  it("offers the launch panel only with the run:nrt permission", () => {
    const { unmount } = render(<NrtsPage />);
    expect(screen.getByTestId("launch")).toBeInTheDocument();
    expect(mocks.can).toHaveBeenCalledWith("run:nrt");
    unmount();
    mocks.can.mockReturnValue(false);
    render(<NrtsPage />);
    expect(screen.queryByTestId("launch")).not.toBeInTheDocument();
  });
});
