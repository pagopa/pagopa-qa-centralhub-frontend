import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureNrt } from "@/types/test-lifecycle";
import { NrtPanel } from "./NrtPanel";

const mocks = vi.hoisted(() => ({
  data: undefined as TlFeatureNrt | undefined,
  isError: false,
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlFeatureNrt: () => ({ data: mocks.data, isLoading: false, isError: mocks.isError }),
}));

const DATA: TlFeatureNrt = {
  feature_id: "f1",
  last_run_at: "2026-11-20T08:00:00Z",
  pass_rate: 2 / 3,
  scenarios: [
    {
      scenario_id: "s1", number: 1, tag: "@FDR3_001_01", title: "Pagamento ok", runs: 3,
      pass_rate: 2 / 3, flaky: true, last_run_at: "2026-11-20T08:00:00Z",
      envs: [
        { env: "DEV", status: "PASSED", run_id: "r3", run_at: "2026-11-20T08:00:00Z", allure_url: "https://allure.test/1", origin: "NRT" },
        { env: "UAT", status: "FAILED", run_id: "r2", run_at: "2026-11-19T08:00:00Z", allure_url: "javascript:alert(1)", origin: "NRT" },
      ],
    },
    {
      scenario_id: "s2", number: 2, tag: "@FDR3_001_02", title: "Pagamento ko", runs: 0,
      pass_rate: null, flaky: false, last_run_at: null, envs: [],
    },
  ],
};

describe("NrtPanel", () => {
  beforeEach(() => {
    mocks.data = DATA;
    mocks.isError = false;
  });

  it("shows the latest result per environment, pass rate and flaky flag", () => {
    render(<NrtPanel featureId="f1" />);
    const row = screen.getByTestId("nrt-s1");
    expect(within(row).getByText("@FDR3_001_01")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "DEV Passato" })).toHaveAttribute("href", "https://allure.test/1");
    expect(within(row).queryByRole("link", { name: /UAT/ })).toBeNull();
    expect(within(row).getByText("UAT Fallito")).toBeInTheDocument();
    expect(within(row).getByText("67%")).toBeInTheDocument();
    expect(within(row).getByText("Flaky")).toBeInTheDocument();
    expect(screen.getByText(/Pass rate complessivo: 67%/)).toBeInTheDocument();
  });

  it("marks scenarios never executed", () => {
    render(<NrtPanel featureId="f1" />);
    expect(within(screen.getByTestId("nrt-s2")).getByText("Mai eseguito")).toBeInTheDocument();
  });

  it("explains when nothing has run yet and shows load errors", () => {
    mocks.data = { ...DATA, last_run_at: null, pass_rate: null, scenarios: [DATA.scenarios[1]] };
    const { rerender } = render(<NrtPanel featureId="f1" />);
    expect(screen.getByText(/Nessuna esecuzione NRT/)).toBeInTheDocument();
    mocks.isError = true;
    mocks.data = undefined;
    rerender(<NrtPanel featureId="f1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Impossibile caricare gli esiti NRT.");
  });
});
