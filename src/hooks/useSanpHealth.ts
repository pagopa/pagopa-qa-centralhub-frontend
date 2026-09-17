import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  SanpHealthLatestResponse,
  SanpHealthReportDetail,
  SanpHealthReportsResponse,
  SanpHealthSyncResult,
  SanpHealthSyncStatus,
} from "@/types/index";

export const sanpHealthQueryKey = ["sanp-health"] as const;

export function useSanpHealthReports() {
  return useQuery<SanpHealthReportsResponse>({
    queryKey: [...sanpHealthQueryKey, "reports"],
    queryFn: () => apiClient("/api/v1/sanp-health/reports"),
  });
}

export function useLatestSanpHealthReport() {
  return useQuery<SanpHealthLatestResponse>({
    queryKey: [...sanpHealthQueryKey, "reports", "latest"],
    queryFn: () => apiClient("/api/v1/sanp-health/reports/latest"),
  });
}

export function useSanpHealthReport(runId: string | null) {
  return useQuery<SanpHealthReportDetail>({
    queryKey: [...sanpHealthQueryKey, "reports", runId],
    queryFn: () => {
      if (!runId) {
        throw new Error("A SANP Health run ID is required");
      }
      return apiClient(`/api/v1/sanp-health/reports/${runId}`);
    },
    enabled: runId !== null,
  });
}

export function useSanpHealthSyncStatus() {
  return useQuery<SanpHealthSyncStatus | null>({
    queryKey: [...sanpHealthQueryKey, "sync-status"],
    queryFn: () => apiClient("/api/v1/sanp-health/sync-status"),
  });
}

export function useSyncSanpHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient<SanpHealthSyncResult>("/api/v1/sanp-health/sync", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sanpHealthQueryKey }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...sanpHealthQueryKey, "sync-status"] }),
  });
}