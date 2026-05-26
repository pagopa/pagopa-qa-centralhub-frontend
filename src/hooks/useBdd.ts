import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { BddProject, BddScenario, BddSettings, PaginatedResponse } from "@/types/index";

// ── Projects ──────────────────────────────────────────────────────────────────

export function useBddProjects() {
  return useQuery<BddProject[]>({
    queryKey: ["bdd", "projects"],
    queryFn: () => apiClient<BddProject[]>("/api/v1/bdd/projects"),
  });
}

export function useBddProject(id: string) {
  return useQuery<BddProject>({
    queryKey: ["bdd", "projects", id],
    queryFn: () => apiClient<BddProject>(`/api/v1/bdd/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateBddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient<BddProject>("/api/v1/bdd/projects", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bdd", "projects"] }),
  });
}

export function useDeleteBddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/bdd/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bdd", "projects"] }),
  });
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

export function useBddScenarios(projectId: string, statusFilter?: string) {
  return useQuery<BddScenario[]>({
    queryKey: ["bdd", "scenarios", projectId, statusFilter],
    queryFn: () => {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      return apiClient<BddScenario[]>(`/api/v1/bdd/projects/${projectId}/scenarios${params}`);
    },
    enabled: !!projectId,
  });
}

export function useBddAllScenarios(page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<BddScenario>>({
    queryKey: ["bdd", "scenarios", "all", page],
    queryFn: () => apiClient<PaginatedResponse<BddScenario>>(`/api/v1/bdd/scenarios?page=${page}&page_size=${pageSize}`),
  });
}

export function useCreateBddScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<BddScenario, "id" | "created_at" | "updated_at">) =>
      apiClient<BddScenario>("/api/v1/bdd/scenarios", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["bdd", "scenarios", vars.project_id] });
      qc.invalidateQueries({ queryKey: ["bdd", "scenarios", "all"] });
      qc.invalidateQueries({ queryKey: ["bdd", "projects"] });
    },
  });
}

export function useUpdateBddScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; gherkin?: string; tags?: string[]; status?: string; title?: string }) =>
      apiClient<BddScenario>(`/api/v1/bdd/scenarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bdd", "scenarios"] });
    },
  });
}

export function useDeleteBddScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/bdd/scenarios/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bdd", "scenarios"] });
      qc.invalidateQueries({ queryKey: ["bdd", "projects"] });
    },
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function useBddSettings() {
  return useQuery<BddSettings>({
    queryKey: ["bdd", "settings"],
    queryFn: () => apiClient<BddSettings>("/api/v1/bdd/settings"),
  });
}

export function useUpdateBddSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BddSettings & { claude_api_key?: string; confluence_api_token?: string }>) =>
      apiClient<BddSettings>("/api/v1/bdd/settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bdd", "settings"] }),
  });
}

export function useTestBddConnection() {
  return useMutation({
    mutationFn: () => apiClient<{ status: string; provider: string }>("/api/v1/bdd/settings/test", { method: "POST" }),
  });
}
