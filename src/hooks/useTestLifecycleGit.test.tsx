import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useApplyTlRebase,
  usePublishTlRevision,
  useTlGitStatus,
  useTlGitSync,
  useTlIssues,
  useTlRebase,
  useTlStepSuggestions,
  useUpdateTlIssue,
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

describe("test lifecycle git hooks", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("retries the PR with the actor and invalidates feature and issues", async () => {
    api.apiClient.mockResolvedValue({});
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => usePublishTlRevision(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ featureId: "f1", revisionId: "r1" });
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/features/f1/revisions/r1/pr`, {
      method: "POST",
      body: JSON.stringify({ actor_email: "qa@example.com" }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "feature", "f1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "issues"] });
  });

  it("reads git status and runs a sync that invalidates everything", async () => {
    api.apiClient.mockResolvedValue({ configured: true });
    const { wrapper, invalidate } = setup();
    const status = renderHook(() => useTlGitStatus(), { wrapper });
    await waitFor(() => expect(status.result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/git/status`);
    const sync = renderHook(() => useTlGitSync(), { wrapper });
    await act(async () => {
      await sync.result.current.mutateAsync();
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/git/sync`, {
      method: "POST",
      body: JSON.stringify({ actor_email: "qa@example.com" }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl"] });
  });

  it("lists issues with filters and updates one", async () => {
    api.apiClient.mockResolvedValue([]);
    const { wrapper, invalidate } = setup();
    const list = renderHook(() => useTlIssues({ status: "open", feature_id: "f1" }), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/issues?status=open&feature_id=f1`);
    const upd = renderHook(() => useUpdateTlIssue(), { wrapper });
    await act(async () => {
      await upd.result.current.mutateAsync({ issueId: "i1", status: "resolved", featureId: "f1" });
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/issues/i1`, {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved", actor_email: "qa@example.com" }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "issues"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "feature", "f1"] });
  });

  it("loads the rebase view and applies choices", async () => {
    api.apiClient.mockResolvedValue({});
    const { wrapper, invalidate } = setup();
    const view = renderHook(() => useTlRebase("f1", "r1", true), { wrapper });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/features/f1/revisions/r1/rebase`);
    const apply = renderHook(() => useApplyTlRebase(), { wrapper });
    await act(async () => {
      await apply.result.current.mutateAsync({
        featureId: "f1",
        revisionId: "r1",
        lockVersion: 4,
        choices: { s1: "git" },
      });
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/features/f1/revisions/r1/rebase`, {
      method: "POST",
      body: JSON.stringify({ lock_version: 4, actor_email: "qa@example.com", choices: { s1: "git" } }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "rebase", "f1"] });
  });

  it("only queries step suggestions with at least 2 characters", async () => {
    api.apiClient.mockResolvedValue([]);
    const { wrapper } = setup();
    renderHook(() => useTlStepSuggestions("a", "given"), { wrapper });
    expect(api.apiClient).not.toHaveBeenCalled();
    const ok = renderHook(() => useTlStepSuggestions("un ut", "given"), { wrapper });
    await waitFor(() => expect(ok.result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/steps?q=un+ut&keyword=given&limit=10`);
  });
});
