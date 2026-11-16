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

export function useReleaseSyncStatus() {
  const queryClient = useQueryClient();
  const query = useQuery<SyncStatus | null>({
    queryKey: [...releaseStatusQueryKey, "sync-status"],
    queryFn: () => apiClient(`${BASE}/sync-status`),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "QUEUED" || status === "RUNNING" ? SYNC_POLL_MS : false;
    },
  });

  const status = query.data?.status;
  const running = status === "QUEUED" || status === "RUNNING";
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !running) {
      queryClient.invalidateQueries({ queryKey: [...releaseStatusQueryKey, "status"] });
      queryClient.invalidateQueries({ queryKey: [...releaseStatusQueryKey, "summary"] });
    }
    wasRunning.current = running;
  }, [running, queryClient]);

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
    mutationFn: (body: { product_key: string; repository: string }) =>
      apiClient<CheckResult>(`${BASE}/catalog/applications/check`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
