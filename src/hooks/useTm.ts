import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  CsvAbsenceImportResult,
  CostReport,
  ExternalResource,
  ExternalResourceCreate,
  ExternalResourceUpdate,
  ResourceAbsence,
  ResourceAbsenceCreate,
  ResourceAbsenceCsvRow,
  TmSyncResult,
} from "@/types/index";

// ── Resources ─────────────────────────────────────────────────────────────────

export function useTmResources(includeInactive = false) {
  return useQuery<ExternalResource[]>({
    queryKey: ["tm", "resources", { includeInactive }],
    queryFn: () =>
      apiClient(`/api/v1/tm/resources?include_inactive=${includeInactive}`),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateTmResource() {
  const qc = useQueryClient();
  return useMutation<ExternalResource, Error, ExternalResourceCreate>({
    mutationFn: (body) =>
      apiClient("/api/v1/tm/resources", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm", "resources"] }),
  });
}

export function useUpdateTmResource(resourceId: string) {
  const qc = useQueryClient();
  return useMutation<ExternalResource, Error, ExternalResourceUpdate>({
    mutationFn: (body) =>
      apiClient(`/api/v1/tm/resources/${resourceId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm", "resources"] }),
  });
}

export function useDeactivateTmResource() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (resourceId) =>
      apiClient(`/api/v1/tm/resources/${resourceId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm", "resources"] }),
  });
}

// ── Absences ──────────────────────────────────────────────────────────────────

export function useTmAbsences(params: {
  resource_id?: string;
  year?: number;
  month?: number;
}) {
  const sp = new URLSearchParams();
  if (params.resource_id) sp.set("resource_id", params.resource_id);
  if (params.year) sp.set("year", String(params.year));
  if (params.month) sp.set("month", String(params.month));
  return useQuery<ResourceAbsence[]>({
    queryKey: ["tm", "absences", params],
    queryFn: () => apiClient(`/api/v1/tm/absences?${sp.toString()}`),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateTmAbsence() {
  const qc = useQueryClient();
  return useMutation<ResourceAbsence, Error, ResourceAbsenceCreate>({
    mutationFn: (body) =>
      apiClient("/api/v1/tm/absences", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm", "absences"] }),
  });
}

export function useDeleteTmAbsence() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (absenceId) =>
      apiClient(`/api/v1/tm/absences/${absenceId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm", "absences"] }),
  });
}

export function useSyncConfluenceAbsences() {
  const qc = useQueryClient();
  return useMutation<TmSyncResult, Error, { year: number; month: number }>({
    mutationFn: ({ year, month }) =>
      apiClient(
        `/api/v1/tm/absences/sync-confluence?year=${year}&month=${month}`,
        { method: "POST" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm", "absences"] }),
  });
}

export function useImportTmAbsencesCsv() {
  const qc = useQueryClient();
  return useMutation<CsvAbsenceImportResult, Error, ResourceAbsenceCsvRow[]>({
    mutationFn: (rows) =>
      apiClient("/api/v1/tm/absences/import-csv", {
        method: "POST",
        body: JSON.stringify({ rows }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tm", "absences"] }),
  });
}

// ── Costs ─────────────────────────────────────────────────────────────────────

export function useTmCostReport(year: number, month: number) {
  return useQuery<CostReport>({
    queryKey: ["tm", "costs", year, month],
    queryFn: () => apiClient(`/api/v1/tm/costs?year=${year}&month=${month}`),
    staleTime: 2 * 60 * 1000,
  });
}
