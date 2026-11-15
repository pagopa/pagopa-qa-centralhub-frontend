import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSaveFlakyScenarios } from "@/hooks/useNrts";
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
