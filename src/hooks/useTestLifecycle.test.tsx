import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAddTlComment,
  useAddTlScenario,
  useTlDelete,
  useTlDeletePreview,
  useRemoveTlScenario,
  useTlFeature,
  useTlFeatures,
  useTlTransition,
  useTlVersion,
  useValidateSteps,
} from "@/hooks/useTestLifecycle";

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: api.apiClient }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "qa+a@example.com" } } }),
}));

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

describe("test lifecycle hooks", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("adds a scenario with the session actor_email", async () => {
    api.apiClient.mockResolvedValue({});
    const { wrapper } = setup();
    const { result } = renderHook(() => useAddTlScenario(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ featureId: "f1", revisionId: "r1", title: "Ok" });
    });
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-lifecycle/features/f1/revisions/r1/scenarios", {
      method: "POST",
      body: JSON.stringify({ title: "Ok", actor_email: "qa+a@example.com" }),
    });
  });

  it("transitions and invalidates feature and list", async () => {
    api.apiClient.mockResolvedValue({});
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useTlTransition(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ featureId: "f1", revisionId: "r1", action: "submit" });
    });
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-lifecycle/features/f1/revisions/r1/transitions", {
      method: "POST",
      body: JSON.stringify({ action: "submit", actor_email: "qa+a@example.com" }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "feature", "f1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "features"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "history", "f1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "preview", "f1"] });
  });

  it("invalidates comments, history and preview after adding a comment", async () => {
    api.apiClient.mockResolvedValue({});
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useAddTlComment(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ featureId: "f1", revisionId: "r1", body: "x" });
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "comments", "f1", "r1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "history", "f1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "preview", "f1"] });
  });

  it("removes a scenario passing actor_email as an encoded query param", async () => {
    api.apiClient.mockResolvedValue({});
    const { wrapper } = setup();
    const { result } = renderHook(() => useRemoveTlScenario(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ featureId: "f1", revisionId: "r1", scenarioId: "s1" });
    });
    expect(api.apiClient).toHaveBeenCalledWith(
      "/api/v1/test-lifecycle/features/f1/revisions/r1/scenarios/s1?actor_email=qa%2Ba%40example.com",
      { method: "DELETE" },
    );
  });

  it("loads a feature with the encoded actor_email", async () => {
    api.apiClient.mockResolvedValue({ id: "f1" });
    const { wrapper } = setup();
    const { result } = renderHook(() => useTlFeature("f1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(
      "/api/v1/test-lifecycle/features/f1?actor_email=qa%2Ba%40example.com",
    );
  });

  it("lists features with only the defined filters", async () => {
    api.apiClient.mockResolvedValue([]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useTlFeatures({ scope_id: "s1", status: undefined }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-lifecycle/features?scope_id=s1");
  });

  it("validates steps via POST", async () => {
    api.apiClient.mockResolvedValue({ errors: [] });
    const { wrapper } = setup();
    const { result } = renderHook(() => useValidateSteps(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ steps: "Dato x" });
    });
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-lifecycle/gherkin/validate", {
      method: "POST",
      body: JSON.stringify({ steps: "Dato x" }),
    });
  });

  it("loads a version snapshot", async () => {
    api.apiClient.mockResolvedValue({ id: "v1", snapshot: { file: "x" } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useTlVersion("f1", "v1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-lifecycle/features/f1/versions/v1");
  });

  it("does not fetch a version without an id", () => {
    const { wrapper } = setup();
    renderHook(() => useTlVersion("f1", undefined), { wrapper });
    expect(api.apiClient).not.toHaveBeenCalled();
  });

  it("does not fetch the delete preview without an id", () => {
    const { wrapper } = setup();
    renderHook(() => useTlDeletePreview("feature", null), { wrapper });
    expect(api.apiClient).not.toHaveBeenCalled();
  });

  it("requests the feature delete preview url", async () => {
    api.apiClient.mockResolvedValue({ deletable: true });
    const { wrapper } = setup();
    renderHook(() => useTlDeletePreview("feature", "f1"), { wrapper });
    await waitFor(() =>
      expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-lifecycle/features/f1/delete-preview"),
    );
  });

  it("requests the scope delete preview url", async () => {
    api.apiClient.mockResolvedValue({ deletable: true });
    const { wrapper } = setup();
    renderHook(() => useTlDeletePreview("scope", "s1"), { wrapper });
    await waitFor(() =>
      expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-lifecycle/scopes/s1/delete-preview"),
    );
  });

  it("sends actor_email and delete_jira_keys in the DELETE body and invalidates tl queries", async () => {
    api.apiClient.mockResolvedValue({ deleted_features: 1, jira_results: [] });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useTlDelete("feature"), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "f1", deleteJiraKeys: ["PQ-1"] });
    });
    expect(api.apiClient).toHaveBeenCalledWith("/api/v1/test-lifecycle/features/f1", {
      method: "DELETE",
      body: JSON.stringify({ actor_email: "qa+a@example.com", delete_jira_keys: ["PQ-1"] }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "features"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "scopes"] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["tl", "feature", "f1"] });
  });
});
