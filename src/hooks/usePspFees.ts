import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { PspFeeListResponse, PspFeeSyncResponse } from "@/types/index";

export function usePspFees() {
  return useQuery({
    queryKey: ["psp-fees"],
    queryFn: () => apiClient<PspFeeListResponse>("/api/v1/psp-fees"),
    staleTime: 60_000,
  });
}

export function useSyncPspFees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<PspFeeSyncResponse>("/api/v1/psp-fees/sync", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["psp-fees"] }),
  });
}
