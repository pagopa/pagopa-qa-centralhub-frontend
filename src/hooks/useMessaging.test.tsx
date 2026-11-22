import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_INBOX_FILTERS,
  inboxFiltersToParams,
  useInbox,
  useInboxSummary,
  useMarkAllRead,
  useMarkRead,
} from "@/hooks/useMessaging";

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
  email: "me@x.it" as string | undefined,
  allowed: true,
}));
vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: mocks.email ? { user: { email: mocks.email } } : null }),
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (action: string) => action === "view:inbox" && mocks.allowed }),
}));

const HEADERS = { "X-User-Email": "me@x.it" };

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

describe("messaging hooks", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
    mocks.email = "me@x.it";
    mocks.allowed = true;
  });

  it("omits default filters and sets only the active ones", () => {
    expect(inboxFiltersToParams(DEFAULT_INBOX_FILTERS).toString()).toBe("");
    const params = inboxFiltersToParams({ unreadOnly: true, severity: "warning", type: "x.y" });
    expect(params.get("unread_only")).toBe("true");
    expect(params.get("severity")).toBe("warning");
    expect(params.get("type")).toBe("x.y");
  });

  it("requests the summary with the session email header", async () => {
    mocks.apiClient.mockResolvedValue({ unread: 2, total: 5, max_unread_severity: "warning" });
    const { wrapper } = setup();
    const { result } = renderHook(() => useInboxSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.apiClient).toHaveBeenCalledWith(
      "/api/v1/messaging/inbox/summary",
      expect.objectContaining({ headers: HEADERS }),
    );
    expect(result.current.data?.unread).toBe(2);
  });

  it("sends no request while the session has no email", () => {
    mocks.email = undefined;
    const { wrapper } = setup();
    const summary = renderHook(() => useInboxSummary(), { wrapper });
    const list = renderHook(() => useInbox(DEFAULT_INBOX_FILTERS), { wrapper });

    expect(mocks.apiClient).not.toHaveBeenCalled();
    expect(summary.result.current.isError).toBe(false);
    expect(list.result.current.isError).toBe(false);
  });

  it("sends no request without the view:inbox permission", () => {
    mocks.allowed = false;
    const { wrapper } = setup();
    renderHook(() => useInboxSummary(), { wrapper });
    expect(mocks.apiClient).not.toHaveBeenCalled();
  });

  it("loads the next page with the cursor", async () => {
    mocks.apiClient
      .mockResolvedValueOnce({ items: [{ id: "1" }], next_cursor: "c1" })
      .mockResolvedValueOnce({ items: [{ id: "2" }], next_cursor: null });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useInbox({ unreadOnly: true, severity: "all", type: "all" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.apiClient.mock.calls[0][0]).toContain("unread_only=true");
    expect(mocks.apiClient.mock.calls[0][0]).toContain("limit=30");
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(mocks.apiClient.mock.calls[1][0]).toContain("cursor=c1");
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it("marks one message and all messages read, then refreshes every inbox query", async () => {
    mocks.apiClient.mockResolvedValue({ updated: 1 });
    const { wrapper, invalidate } = setup();
    const one = renderHook(() => useMarkRead(), { wrapper });
    await act(async () => {
      await one.result.current.mutateAsync("abc");
    });
    expect(mocks.apiClient).toHaveBeenCalledWith(
      "/api/v1/messaging/inbox/abc/read",
      expect.objectContaining({ method: "POST", headers: HEADERS }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["inbox"] });

    invalidate.mockClear();
    const all = renderHook(() => useMarkAllRead(), { wrapper });
    await act(async () => {
      await all.result.current.mutateAsync();
    });
    expect(mocks.apiClient).toHaveBeenLastCalledWith(
      "/api/v1/messaging/inbox/read-all",
      expect.objectContaining({ method: "POST", headers: HEADERS }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["inbox"] });
  });
});
