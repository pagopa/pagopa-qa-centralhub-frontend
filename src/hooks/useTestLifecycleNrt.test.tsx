import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTlFeatureNrt, useTlRunLinks } from "@/hooks/useTestLifecycle";

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: api.apiClient }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const B = "/api/v1/test-lifecycle";

describe("test lifecycle nrt hooks", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("reads the NRT results of a feature", async () => {
    api.apiClient.mockResolvedValue({ scenarios: [] });
    const { result } = renderHook(() => useTlFeatureNrt("f1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/features/f1/nrt`);
  });

  it("reads the features linked to a run, only when enabled", async () => {
    api.apiClient.mockResolvedValue([]);
    const off = renderHook(() => useTlRunLinks("r1", false), { wrapper });
    expect(off.result.current.fetchStatus).toBe("idle");
    const on = renderHook(() => useTlRunLinks("r1"), { wrapper });
    await waitFor(() => expect(on.result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/nrt/runs/r1/links`);
  });
});
