import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScopeOverview } from "./ScopeOverview";

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlScopes: () => ({
    isLoading: false,
    isError: false,
    data: [
      { id: "s1", code: "FdR3", name: "Fondo", area: null, feature_count: 2, status_counts: { running: 2 }, nrt_pass_rate: 0.8 },
      { id: "s2", code: "CUP", name: "Cup", area: null, feature_count: 1, status_counts: { draft: 1 }, nrt_pass_rate: null },
    ],
  }),
}));

describe("ScopeOverview", () => {
  it("shows the NRT pass rate only for scopes with executions", () => {
    render(<ScopeOverview />);
    expect(screen.getByText("NRT 80%")).toBeInTheDocument();
    expect(screen.getAllByText(/^NRT /)).toHaveLength(1);
  });
});
