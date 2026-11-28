import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNrts, usePendingRuns, useSaveFlakyScenarios } from "@/hooks/useNrts";
import type { FlakyScenario } from "@/types";

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

const item: FlakyScenario = {
  suite_id: "s1",
  test_object: "checkout",
  test_type: "e2e",
  scenario_name: "Pay",
  test_object_version: "1",
  test_version: "1",
  inserted_at: null,
  is_flaky: true,
};

describe("useSaveFlakyScenarios", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("sends the reviewer email with every flag and refreshes both flaky views", async () => {
    api.apiClient.mockResolvedValue([item]);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useSaveFlakyScenarios(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync([item]);
    });
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-metrics/flaky-scenarios/save", {
      method: "POST",
      body: JSON.stringify([{ ...item, user: "me@x.it" }]),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["flaky-scenarios"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["flaky"] });
  });
});

describe("usePendingRuns", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("reads the runs still pending review", async () => {
    api.apiClient.mockResolvedValue({ total: 7, nrt: 5, qg: 2 });
    const { wrapper } = setup();
    const { result } = renderHook(() => usePendingRuns(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ total: 7, nrt: 5, qg: 2 }));
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-metrics/pending-runs");
  });
});

describe("useNrts filters", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("sends the outcome and ticket status filters only when set", async () => {
    api.apiClient.mockResolvedValue({ items: [], total: 0 });
    const { wrapper } = setup();
    renderHook(() => useNrts({ page: 2, revision_result: "KO", ticket_status: "In Review" }), { wrapper });
    await waitFor(() => expect(api.apiClient).toHaveBeenCalledTimes(1));
    const url = new URL(api.apiClient.mock.calls[0][0] as string, "http://x");
    expect(url.searchParams.get("revision_result")).toBe("KO");
    expect(url.searchParams.get("ticket_status")).toBe("In Review");
    expect(url.searchParams.get("page")).toBe("2");

    api.apiClient.mockClear();
    renderHook(() => useNrts({ revision_result: "", ticket_status: "" }), { wrapper });
    await waitFor(() => expect(api.apiClient).toHaveBeenCalledTimes(1));
    const bare = new URL(api.apiClient.mock.calls[0][0] as string, "http://x");
    expect(bare.searchParams.has("revision_result")).toBe(false);
    expect(bare.searchParams.has("ticket_status")).toBe(false);
  });
});

describe("useNrts while the filters change", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("keeps showing the previous list until the new one arrives", async () => {
    let release: (value: unknown) => void = () => undefined;
    api.apiClient
      .mockResolvedValueOnce({ items: [{ id: "old" }], total: 1 })
      .mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    const { wrapper } = setup();
    const { result, rerender } = renderHook(
      ({ outcome }: { outcome?: string }) => useNrts({ revision_result: outcome }),
      { wrapper, initialProps: {} as { outcome?: string } },
    );
    await waitFor(() => expect(result.current.data).toEqual({ items: [{ id: "old" }], total: 1 }));

    rerender({ outcome: "KO" });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ items: [{ id: "old" }], total: 1 });
    release({ items: [{ id: "new" }], total: 1 });
    await waitFor(() => expect(result.current.data).toEqual({ items: [{ id: "new" }], total: 1 }));
  });
});
