import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  DqCatalogControl,
  DqCatalogControlCreate,
  DqCatalogControlUpdate,
  DqCategory,
  DqControlInstance,
  DqControlInstanceCreate,
  DqControlInstanceUpdate,
  DqDimension,
  DqDimensionCreate,
  DqDimensionUpdate,
  DqDomain,
  DqDomainCreate,
  DqDomainUpdate,
} from "@/types/index";

// ── Dimensions ────────────────────────────────────────────────────────────────

export function useDqDimensions() {
  return useQuery<DqDimension[]>({
    queryKey: ["dq", "dimensions"],
    queryFn: () => apiClient<DqDimension[]>("/api/v1/dq/dimensions"),
  });
}

export function useCreateDqDimension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DqDimensionCreate) =>
      apiClient<DqDimension>("/api/v1/dq/dimensions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "dimensions"] }),
  });
}

export function useUpdateDqDimension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & DqDimensionUpdate) =>
      apiClient<DqDimension>(`/api/v1/dq/dimensions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "dimensions"] }),
  });
}

export function useDeleteDqDimension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/api/v1/dq/dimensions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "dimensions"] }),
  });
}

// ── Domains ───────────────────────────────────────────────────────────────────

export function useDqDomains() {
  return useQuery<DqDomain[]>({
    queryKey: ["dq", "domains"],
    queryFn: () => apiClient<DqDomain[]>("/api/v1/dq/domains"),
  });
}

export function useCreateDqDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DqDomainCreate) =>
      apiClient<DqDomain>("/api/v1/dq/domains", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "domains"] }),
  });
}

export function useUpdateDqDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & DqDomainUpdate) =>
      apiClient<DqDomain>(`/api/v1/dq/domains/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "domains"] }),
  });
}

export function useDeleteDqDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/api/v1/dq/domains/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "domains"] }),
  });
}

// ── Catalog controls ────────────────────────────────────────────────────────

export function useDqCatalog(category?: DqCategory) {
  return useQuery<DqCatalogControl[]>({
    queryKey: ["dq", "catalog", category ?? "all"],
    queryFn: () => {
      const params = category ? `?category=${category}` : "";
      return apiClient<DqCatalogControl[]>(`/api/v1/dq/catalog${params}`);
    },
  });
}

export function useCreateDqCatalogControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DqCatalogControlCreate) =>
      apiClient<DqCatalogControl>("/api/v1/dq/catalog", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "catalog"] }),
  });
}

export function useUpdateDqCatalogControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & DqCatalogControlUpdate) =>
      apiClient<DqCatalogControl>(`/api/v1/dq/catalog/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "catalog"] }),
  });
}

export function useDeleteDqCatalogControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/api/v1/dq/catalog/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "catalog"] }),
  });
}

// ── Control instances ────────────────────────────────────────────────────────

export function useDqInstances(domainId?: string, category?: DqCategory) {
  return useQuery<DqControlInstance[]>({
    queryKey: ["dq", "instances", domainId ?? "all", category ?? "all"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (domainId) params.set("domain_id", domainId);
      if (category) params.set("category", category);
      const qs = params.toString();
      return apiClient<DqControlInstance[]>(`/api/v1/dq/instances${qs ? `?${qs}` : ""}`);
    },
    enabled: !!domainId,
  });
}

export function useCreateDqInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DqControlInstanceCreate) =>
      apiClient<DqControlInstance>("/api/v1/dq/instances", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "instances"] }),
  });
}

export function useUpdateDqInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & DqControlInstanceUpdate) =>
      apiClient<DqControlInstance>(`/api/v1/dq/instances/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "instances"] }),
  });
}

export function useDeleteDqInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/api/v1/dq/instances/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dq", "instances"] }),
  });
}
