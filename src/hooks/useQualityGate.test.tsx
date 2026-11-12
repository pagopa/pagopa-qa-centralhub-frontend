import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useDeleteRun,
  useLaunchRun,
  useNrtLaunchOptions,
  useRuns,
  type QualityGateRunStatus,
} from "@/hooks/useQualityGate";

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: api.apiClient }));

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

function status(id: string, state: QualityGateRunStatus["state"]): QualityGateRunStatus {
  return { correlation_id: id, run_name: `tas-${id}`, state, conclusion: null, html_url: null, created_at: null, updated_at: null };
}

describe("origin-parametric run hooks", () => {
  beforeEach(() => api.apiClient.mockReset());

  it.each([
    ["QG", "/api/v1/quality-gate/runs"],
    ["TAS", "/api/v1/test-metrics/tas/runs"],
    ["NRT", "/api/v1/test-metrics/nrts/runs"],
  ] as const)("launches a %s run through its endpoint", async (origin, path) => {
    api.apiClient.mockResolvedValue({ correlation_id: "x", run_name: "y", actions_url: "z" });
    const { wrapper } = setup();
    const { result } = renderHook(() => useLaunchRun<{ a: number }>(origin), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ a: 1 });
    });
    expect(api.apiClient).toHaveBeenCalledWith(path, { method: "POST", body: JSON.stringify({ a: 1 }) });
  });

  it.each([
    ["QG", "/api/v1/quality-gate/test-runs/r1"],
    ["TAS", "/api/v1/test-metrics/tas/test-runs/r1"],
    ["NRT", "/api/v1/test-metrics/nrts/test-runs/r1"],
  ] as const)("deletes a %s run and refreshes the lists", async (origin, path) => {
    api.apiClient.mockResolvedValue(undefined);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useDeleteRun(origin), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("r1");
    });
    expect(api.apiClient).toHaveBeenCalledWith(path, { method: "DELETE" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["nrts"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["suites"] });
  });

  it("lists the runs of the origin", async () => {
    api.apiClient.mockResolvedValue([status("a".repeat(32), "completed")]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useRuns("TAS"), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-metrics/tas/runs");
  });

  it("refreshes the lists when an active run completes", async () => {
    const id = "b".repeat(32);
    api.apiClient.mockResolvedValueOnce([status(id, "in_progress")]);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useRuns("NRT"), { wrapper });
    await waitFor(() => expect(result.current.data?.[0].state).toBe("in_progress"));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["nrts"] });

    api.apiClient.mockResolvedValueOnce([status(id, "completed")]);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["nrts"] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["suites"] });
  });

  it("reads the NRT launch options", async () => {
    api.apiClient.mockResolvedValue({ available: true, suites: [] });
    const { wrapper } = setup();
    const { result } = renderHook(() => useNrtLaunchOptions(), { wrapper });
    await waitFor(() => expect(result.current.data?.available).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-metrics/nrts/launch-options");
  });
});
