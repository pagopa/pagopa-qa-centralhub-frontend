import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FLAKY_FILTERS,
  flakyFiltersToParams,
  useFlakyHistory,
  useFlakyScenarios,
  useFlakySummary,
  useRecomputeFlaky,
  useRunScenarioScores,
  useSetFlakyFlag,
} from "@/hooks/useFlaky";

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: api.apiClient }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { email: "me@x.it" } } }) }));

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

describe("flaky hooks", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("serializes filters with repeated test_object and no empty values", () => {
    const params = flakyFiltersToParams({
      ...DEFAULT_FLAKY_FILTERS,
      testObjects: ["checkout", "gpd"],
      flag: "unflagged",
      minLevel: 4,
      hint: "to_mark",
      q: "pay",
    });
    expect(params.toString()).toBe("env=UAT&test_object=checkout&test_object=gpd&flag=unflagged&min_level=4&hint=to_mark&q=pay");
    expect(flakyFiltersToParams(DEFAULT_FLAKY_FILTERS).toString()).toBe("env=UAT&flag=all");
  });

  it("lists scenarios with filters and page", async () => {
    api.apiClient.mockResolvedValue({ items: [], total: 0, page: 2, page_size: 50 });
    const { wrapper } = setup();
    renderHook(() => useFlakyScenarios(DEFAULT_FLAKY_FILTERS, 2), { wrapper });
    await waitFor(() => expect(api.apiClient).toHaveBeenCalledWith("/api/v1/flaky/scenarios?env=UAT&flag=all&page=2&page_size=50"));
  });

  it("loads the summary without the hint filter", async () => {
    api.apiClient.mockResolvedValue({ to_mark: 0, to_unmark: 0, broken: 0, flagged: 0, analyzed: 0 });
    const { wrapper } = setup();
    renderHook(() => useFlakySummary({ ...DEFAULT_FLAKY_FILTERS, hint: "broken" }), { wrapper });
    await waitFor(() => expect(api.apiClient).toHaveBeenCalledWith("/api/v1/flaky/summary?env=UAT&flag=all"));
  });

  it("loads history only for a selected scenario", async () => {
    api.apiClient.mockResolvedValue([]);
    const { wrapper } = setup();
    const { rerender } = renderHook(({ key }) => useFlakyHistory(key), {
      wrapper,
      initialProps: { key: null as Parameters<typeof useFlakyHistory>[0] },
    });
    expect(api.apiClient).not.toHaveBeenCalled();
    rerender({ key: { env: "UAT", test_object: "checkout", test_type: "e2e", scenario_name: "Pay & go" } });
    await waitFor(() => expect(api.apiClient).toHaveBeenCalledWith(
      "/api/v1/flaky/scenarios/history?env=UAT&test_object=checkout&test_type=e2e&scenario_name=Pay+%26+go",
    ));
  });

  it("sets a flag with the reviewer email and refreshes flaky and NRT flags", async () => {
    api.apiClient.mockResolvedValue({});
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useSetFlakyFlag(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ test_object: "checkout", test_type: "e2e", scenario_name: "Pay", is_flaky: false });
    });
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/flaky/scenarios/flag", {
      method: "PUT",
      body: JSON.stringify({ test_object: "checkout", test_type: "e2e", scenario_name: "Pay", is_flaky: false, user: "me@x.it" }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["flaky"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["flaky-scenarios"] });
  });

  it("recomputes with the reviewer email and refreshes everything flaky", async () => {
    api.apiClient.mockResolvedValue({ id: 1 });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useRecomputeFlaky(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/flaky/recompute", {
      method: "POST",
      body: JSON.stringify({ user: "me@x.it" }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["flaky"] });
  });
});

describe("useRunScenarioScores", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("asks for the run scenarios in the run environment, keyed by type and name", async () => {
    api.apiClient.mockResolvedValue({ items: [{ test_type: "e2e", scenario_name: "Pay & go", level: 5 }], total: 1, page: 1, page_size: 200 });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useRunScenarioScores({ env: "UAT", testObject: "checkout", scenarioNames: ["Pay & go", "Refund"] }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.scores.size).toBe(1));
    expect(api.apiClient).toHaveBeenCalledWith(
      "/api/v1/flaky/scenarios?env=UAT&test_object=checkout&flag=all&page=1&page_size=200&scenario_name=Pay+%26+go&scenario_name=Refund",
    );
    expect(result.current.scores.get("e2e|Pay & go")?.level).toBe(5);
  });

  it.each([
    [{ env: null, testObject: "checkout", scenarioNames: ["Pay"] }],
    [{ env: "STAGING", testObject: "checkout", scenarioNames: ["Pay"] }],
    [{ env: "UAT", testObject: "checkout", scenarioNames: [] }],
  ])("does not call the API without a known environment or scenarios (%o)", (args) => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useRunScenarioScores(args), { wrapper });
    expect(api.apiClient).not.toHaveBeenCalled();
    expect(result.current.scores.size).toBe(0);
  });
});
