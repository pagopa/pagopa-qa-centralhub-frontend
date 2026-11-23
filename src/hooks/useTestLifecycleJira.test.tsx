import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useCreateTlJiraTask,
  useCreateTlScopeEpic,
  useRefreshTlJira,
  useTlJiraEpics,
} from "@/hooks/useTestLifecycle";

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: api.apiClient }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "qa@example.com" } } }),
}));

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

const B = "/api/v1/test-lifecycle";
const ACTOR = JSON.stringify({ actor_email: "qa@example.com" });

describe("test lifecycle jira hooks", () => {
  beforeEach(() => api.apiClient.mockReset());

  it.each([
    ["design", "design-task"],
    ["impl", "impl-task"],
  ] as const)("creates the %s task and returns the warning", async (kind, path) => {
    api.apiClient.mockResolvedValue({ id: "f1", jira_warning: "Assegnatario non trovato" });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateTlJiraTask(), { wrapper });
    let data: { jira_warning?: string | null } | undefined;
    await act(async () => {
      data = await result.current.mutateAsync({ featureId: "f1", kind });
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/features/f1/jira/${path}`, {
      method: "POST",
      body: ACTOR,
    });
    expect(data?.jira_warning).toBe("Assegnatario non trovato");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "feature", "f1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "history", "f1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "issues"] });
  });

  it("refreshes the jira statuses of a feature", async () => {
    api.apiClient.mockResolvedValue({ id: "f1" });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useRefreshTlJira(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ featureId: "f1" });
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/features/f1/jira/refresh`, {
      method: "POST",
      body: ACTOR,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "feature", "f1"] });
  });

  it("creates the scope QA epic and invalidates the scopes", async () => {
    api.apiClient.mockResolvedValue({ id: "s1", jira_qa_epic_key: "PQ-900" });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateTlScopeEpic(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ scopeId: "s1" });
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/scopes/s1/jira/epic`, {
      method: "POST",
      body: ACTOR,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "scopes"] });
  });

  it("searches QA epics only when enabled, encoding the text", async () => {
    api.apiClient.mockResolvedValue([{ key: "PQ-495" }]);
    const { wrapper } = setup();
    const off = renderHook(() => useTlJiraEpics("FdR", false), { wrapper });
    expect(off.result.current.fetchStatus).toBe("idle");
    expect(api.apiClient).not.toHaveBeenCalled();
    const on = renderHook(() => useTlJiraEpics("FdR 3", true), { wrapper });
    await waitFor(() => expect(on.result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/jira/epics?q=FdR+3`);
  });
});
