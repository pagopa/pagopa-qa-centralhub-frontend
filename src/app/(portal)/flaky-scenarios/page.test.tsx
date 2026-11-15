import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlakyScenarioRow } from "@/types/flaky";
import FlakyScenariosLayout from "./layout";
import FlakyScenariosPage from "./page";

const hooks = vi.hoisted(() => ({
  scenarios: vi.fn(),
  summary: vi.fn(),
  status: vi.fn(),
  suites: vi.fn(),
  guard: vi.fn(),
  setFlag: vi.fn(),
  can: vi.fn((action: string) => Boolean(action)),
}));

vi.mock("@/hooks/useFlaky", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/useFlaky")>()),
  useFlakyScenarios: hooks.scenarios,
  useFlakySummary: hooks.summary,
  useFlakyRecomputeStatus: hooks.status,
  useFlakyHistory: () => ({ data: undefined, isLoading: false }),
  useSetFlakyFlag: () => ({ mutate: hooks.setFlag, isPending: false }),
  useRecomputeFlaky: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));
vi.mock("@/hooks/useSuites", () => ({ useSuites: hooks.suites }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: hooks.can, isLoading: false }) }));
vi.mock("@/components/auth/RouteGuard", () => ({
  RouteGuard: ({ action, children }: { action: string; children: ReactNode }) => {
    hooks.guard(action);
    return <>{children}</>;
  },
}));

const summary = { to_mark: 7, to_unmark: 4, broken: 2, flagged: 23, analyzed: 412 };

const row: FlakyScenarioRow = {
  test_object: "checkout", test_type: "e2e", scenario_name: "Pay with card", env: "UAT",
  score: 68, level: 5, state: "OK", flip_rate: 0.54, retry_pass_rate: 0.25, runs_analyzed: 28,
  last_failure_at: null, recent_outcomes: [], last_suite_id: "s1", is_flaky: false,
  flagged_by: null, flagged_at: null, hint: "to_mark",
};

describe("Flaky scenarios page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.can.mockImplementation((action: string) => Boolean(action));
    hooks.scenarios.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false, error: null });
    hooks.summary.mockReturnValue({ data: summary });
    hooks.status.mockReturnValue({ data: { last_attempt_at: "2026-11-14T11:00:00Z", last_success_at: "2026-11-14T11:00:00Z", last_error: null, last_trigger: "SCHEDULE", last_requested_by: null, scored_count: 412 } });
    hooks.suites.mockReturnValue({ data: ["checkout"] });
  });

  it("guards the route with view:flaky", () => {
    render(<FlakyScenariosLayout><p>child</p></FlakyScenariosLayout>);
    expect(hooks.guard).toHaveBeenCalledWith("view:flaky");
  });

  it("shows the title, the last recompute and the hint boxes", () => {
    render(<FlakyScenariosPage />);
    expect(screen.getByRole("heading", { name: "Scenari flaky" })).toBeInTheDocument();
    expect(screen.getByText(/Ultimo ricalcolo:/)).toHaveTextContent(/14\/11\/2026.*automatico/);
    expect(screen.getByRole("button", { name: /Da marcare\s*7/ })).toBeInTheDocument();
  });

  it("says when the index was never computed", () => {
    hooks.status.mockReturnValue({ data: null });
    render(<FlakyScenariosPage />);
    expect(screen.getByText(/Ultimo ricalcolo:/)).toHaveTextContent("mai eseguito");
  });

  it("filters the list by hint from the boxes and clears it on a second click", async () => {
    render(<FlakyScenariosPage />);
    await userEvent.click(screen.getByRole("button", { name: /Da marcare/ }));
    expect(hooks.scenarios).toHaveBeenLastCalledWith(expect.objectContaining({ hint: "to_mark" }), 1);
    await userEvent.click(screen.getByRole("button", { name: /Da marcare/ }));
    expect(hooks.scenarios).toHaveBeenLastCalledWith(expect.objectContaining({ hint: null }), 1);
  });

  it("starts on UAT with every flag", () => {
    render(<FlakyScenariosPage />);
    expect(hooks.scenarios).toHaveBeenCalledWith(expect.objectContaining({ env: "UAT", flag: "all", testObjects: [] }), 1);
  });

  it("flags a scenario optimistically and rolls back when saving fails", async () => {
    hooks.scenarios.mockReturnValue({ data: { items: [row], total: 1, page: 1, page_size: 50 }, isLoading: false, error: null });
    render(<FlakyScenariosPage />);
    const toggle = screen.getByRole("switch", { name: "Flaky: Pay with card" });
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    const [body, options] = hooks.setFlag.mock.calls[0];
    expect(body).toEqual({ test_object: "checkout", test_type: "e2e", scenario_name: "Pay with card", is_flaky: true });

    act(() => options.onError(new Error("boom")));
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("alert")).toHaveTextContent("Impossibile aggiornare il flag di Pay with card");
  });

  it("keeps flags read-only for roles without manage:flaky", () => {
    hooks.can.mockImplementation((action: string) => action !== "manage:flaky");
    hooks.scenarios.mockReturnValue({ data: { items: [row], total: 1, page: 1, page_size: 50 }, isLoading: false, error: null });
    render(<FlakyScenariosPage />);
    expect(screen.getByRole("switch", { name: "Flaky: Pay with card" })).toBeDisabled();
  });

  it("pages through results", async () => {
    hooks.scenarios.mockReturnValue({ data: { items: [row], total: 120, page: 1, page_size: 50 }, isLoading: false, error: null });
    render(<FlakyScenariosPage />);
    expect(screen.getByText("1–50 di 120")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Pagina successiva" }));
    expect(hooks.scenarios).toHaveBeenLastCalledWith(expect.anything(), 2);
  });

  it("opens the scenario details on row click and closes them", async () => {
    hooks.scenarios.mockReturnValue({ data: { items: [row], total: 1, page: 1, page_size: 50 }, isLoading: false, error: null });
    render(<FlakyScenariosPage />);
    await userEvent.click(screen.getByText("Pay with card"));
    expect(screen.getByRole("dialog", { name: "Dettaglio Pay with card" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers recompute and the explanation in the header", () => {
    render(<FlakyScenariosPage />);
    expect(screen.getByRole("button", { name: "Ricalcola ora" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Come si calcola" })).toBeInTheDocument();
  });
});
