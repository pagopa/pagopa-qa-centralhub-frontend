import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReleaseSyncStatus } from "@/hooks/useReleaseStatus";
import type { SyncStatus } from "@/types/release-status";

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: api.apiClient }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { email: "me@x.it" } } }) }));

const SYNC_KEY = ["release-status", "sync-status"];

function sync(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    status: "OK",
    trigger: "SCHEDULED",
    requested_by: null,
    queued_at: null,
    started_at: null,
    finished_at: "2026-11-16T10:00:00Z",
    last_success_at: "2026-11-16T10:00:00Z",
    applications_checked: 1,
    reads_failed: 0,
    errors: [],
    in_progress: false,
    ...overrides,
  };
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, invalidate, wrapper };
}

function refetchInterval(queryClient: QueryClient): unknown {
  const query = queryClient.getQueryCache().find({ queryKey: SYNC_KEY });
  const option = (query?.options as { refetchInterval?: unknown } | undefined)?.refetchInterval;
  return typeof option === "function" ? option(query) : option;
}

describe("useReleaseSyncStatus", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("polls every 3 s only while the sync is in progress", async () => {
    api.apiClient.mockResolvedValue(sync({ status: "RUNNING", in_progress: true, finished_at: null }));
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useReleaseSyncStatus(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(refetchInterval(queryClient)).toBe(3000);
  });

  it("polls in the background every 60 s when idle or stale", async () => {
    api.apiClient.mockResolvedValue(sync({ status: "RUNNING", in_progress: false, finished_at: null }));
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useReleaseSyncStatus(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(refetchInterval(queryClient)).toBe(60_000);
  });

  it("refreshes status, summary and the open detail when finished_at changes", async () => {
    const onFinished = vi.fn();
    api.apiClient.mockResolvedValue(sync());
    const { queryClient, invalidate, wrapper } = setup();
    const { result } = renderHook(() => useReleaseSyncStatus({ onFinished }), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(invalidate).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();

    // A new sync starts: finished_at is cleared, nothing is refreshed yet.
    queryClient.setQueryData(SYNC_KEY, sync({ status: "QUEUED", in_progress: true, finished_at: null }));
    await waitFor(() => expect(result.current.data?.status).toBe("QUEUED"));
    expect(invalidate).not.toHaveBeenCalled();

    // The sync finished (the running state may never have been observed).
    queryClient.setQueryData(SYNC_KEY, sync({ finished_at: "2026-11-16T10:15:00Z" }));
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["release-status", "status"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["release-status", "summary"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["release-status", "application"] });
  });
});
