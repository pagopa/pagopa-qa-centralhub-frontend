import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAnalyzeTlMigration,
  useExecuteTlMigrationScope,
  usePatchTlMigrationItem,
  usePatchTlMigrationTag,
  useTlCategoryTags,
  useTlMigrationItems,
} from "@/hooks/useTestLifecycle";

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: api.apiClient }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "qa@example.com" } } }),
}));

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

const B = "/api/v1/test-lifecycle";

describe("test lifecycle migration hooks", () => {
  beforeEach(() => api.apiClient.mockReset());

  it("analyzes and invalidates the migration", async () => {
    api.apiClient.mockResolvedValue({});
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useAnalyzeTlMigration(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/migration/analyze`, {
      method: "POST",
      body: JSON.stringify({ actor_email: "qa@example.com" }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl", "migration"] });
  });

  it("lists items with filters and the actor", async () => {
    api.apiClient.mockResolvedValue([]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useTlMigrationItems({ scope_code: "FdR3", problem: "no_code" }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(
      `${B}/migration/items?actor_email=qa%40example.com&scope_code=FdR3&problem=no_code`,
    );
  });

  it("patches an item, a tag and executes a scope", async () => {
    api.apiClient.mockResolvedValue({});
    const { wrapper, invalidate } = setup();
    const item = renderHook(() => usePatchTlMigrationItem(), { wrapper });
    await act(async () => {
      await item.result.current.mutateAsync({ id: "i1", decision: "confirmed", overrides: { number: 4 } });
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/migration/items/i1`, {
      method: "PATCH",
      body: JSON.stringify({ actor_email: "qa@example.com", decision: "confirmed", overrides: { number: 4 } }),
    });
    const tag = renderHook(() => usePatchTlMigrationTag(), { wrapper });
    await act(async () => {
      await tag.result.current.mutateAsync({ name: "regression", decision: "drop" });
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/migration/tags/regression`, expect.objectContaining({ method: "PATCH" }));
    const exec = renderHook(() => useExecuteTlMigrationScope(), { wrapper });
    await act(async () => {
      await exec.result.current.mutateAsync({ scopeCode: "FdR3" });
    });
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/migration/scopes/FdR3/execute`, {
      method: "POST",
      body: JSON.stringify({ actor_email: "qa@example.com" }),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tl"] });
  });

  it("reads the category tags", async () => {
    api.apiClient.mockResolvedValue(["e2e"]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useTlCategoryTags(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.apiClient).toHaveBeenCalledWith(`${B}/category-tags`);
  });
});
