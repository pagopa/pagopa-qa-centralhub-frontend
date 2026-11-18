import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api";
import type {
  Application,
  ApplicationDetail,
  ApplicationInput,
  CheckResult,
  EaComponent,
  Product,
  ProductInput,
  ReleaseStatus,
  ReleaseSummary,
  SyncStatus,
} from "@/types/release-status";

export const releaseStatusQueryKey = ["release-status"] as const;

const BASE = "/api/v1/releases";
const SYNC_POLL_MS = 3000;
const SYNC_IDLE_POLL_MS = 60_000;

function useUserEmail(): string {
  const { data: session } = useSession();
  return session?.user?.email ?? "";
}

export function useReleaseStatus() {
  return useQuery<ReleaseStatus>({
    queryKey: [...releaseStatusQueryKey, "status"],
    queryFn: () => apiClient(`${BASE}/status`),
  });
}

export function useReleaseSummary() {
  return useQuery<ReleaseSummary>({
    queryKey: [...releaseStatusQueryKey, "summary"],
    queryFn: () => apiClient(`${BASE}/summary`),
  });
}

export function useApplicationDetail(id: string | null) {
  return useQuery<ApplicationDetail>({
    queryKey: [...releaseStatusQueryKey, "application", id],
    queryFn: () => apiClient(`${BASE}/applications/${id}`),
    enabled: id !== null,
  });
}

interface SyncStatusOptions {
  /** Called once each time a sync finishes (its `finished_at` changes). */
  onFinished?: () => void;
}

export function useReleaseSyncStatus({ onFinished }: SyncStatusOptions = {}) {
  const queryClient = useQueryClient();
  const query = useQuery<SyncStatus | null>({
    queryKey: [...releaseStatusQueryKey, "sync-status"],
    queryFn: () => apiClient(`${BASE}/sync-status`),
    // Fast polling only while the backend says a sync is in progress (a stale row is not);
    // otherwise a slow background poll picks up scheduled syncs.
    refetchInterval: (q) => (q.state.data?.in_progress ? SYNC_POLL_MS : SYNC_IDLE_POLL_MS),
  });

  const loaded = query.data !== undefined;
  const finishedAt = query.data?.finished_at ?? null;
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  // React to every new finished_at, not to a running -> idle edge that polling can miss.
  const lastFinishedAt = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!loaded) return;
    const previous = lastFinishedAt.current;
    lastFinishedAt.current = finishedAt;
    if (previous === undefined || finishedAt === null || finishedAt === previous) return;
    queryClient.invalidateQueries({ queryKey: [...releaseStatusQueryKey, "status"] });
    queryClient.invalidateQueries({ queryKey: [...releaseStatusQueryKey, "summary"] });
    queryClient.invalidateQueries({ queryKey: [...releaseStatusQueryKey, "application"] });
    onFinishedRef.current?.();
  }, [loaded, finishedAt, queryClient]);

  return query;
}

export function useTriggerReleaseSync() {
  const queryClient = useQueryClient();
  const user = useUserEmail();
  return useMutation({
    mutationFn: () =>
      apiClient<SyncStatus>(`${BASE}/sync`, { method: "POST", body: JSON.stringify({ user }) }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: [...releaseStatusQueryKey, "sync-status"] }),
  });
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: [...releaseStatusQueryKey, "products"],
    queryFn: () => apiClient(`${BASE}/catalog/products`),
  });
}

export function useApplications(productId?: string) {
  const params = productId ? `?product_id=${encodeURIComponent(productId)}` : "";
  return useQuery<Application[]>({
    queryKey: [...releaseStatusQueryKey, "applications", productId ?? null],
    queryFn: () => apiClient(`${BASE}/catalog/applications${params}`),
  });
}

export function useTestObjects() {
  return useQuery<string[]>({
    queryKey: [...releaseStatusQueryKey, "test-objects"],
    queryFn: () => apiClient(`${BASE}/catalog/test-objects`),
  });
}

export function useEaComponents(q: string) {
  return useQuery<EaComponent[]>({
    queryKey: [...releaseStatusQueryKey, "ea-components", q],
    queryFn: () => apiClient(`${BASE}/catalog/ea-components?q=${encodeURIComponent(q)}`),
  });
}

export function useSaveProduct() {
  const queryClient = useQueryClient();
  const user = useUserEmail();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ProductInput> & { id?: string }) =>
      apiClient<Product>(id ? `${BASE}/catalog/products/${id}` : `${BASE}/catalog/products`, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify({ ...body, user }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: releaseStatusQueryKey }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const user = useUserEmail();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`${BASE}/catalog/products/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ user }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: releaseStatusQueryKey }),
  });
}

export function useSaveApplication() {
  const queryClient = useQueryClient();
  const user = useUserEmail();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ApplicationInput> & { id?: string }) =>
      apiClient<Application>(
        id ? `${BASE}/catalog/applications/${id}` : `${BASE}/catalog/applications`,
        { method: id ? "PATCH" : "POST", body: JSON.stringify({ ...body, user }) },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: releaseStatusQueryKey }),
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  const user = useUserEmail();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`${BASE}/catalog/applications/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ user }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: releaseStatusQueryKey }),
  });
}

export function useCheckApplication() {
  return useMutation({
    // repo_only: manual applications have no /info endpoint, so only the repository is probed
    mutationFn: (body: { product_key: string; repository: string; repo_only?: boolean }) =>
      apiClient<CheckResult>(`${BASE}/catalog/applications/check`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
