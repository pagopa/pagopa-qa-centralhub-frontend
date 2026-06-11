import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { GpdPositionsResponse, GpdPositionSyncResponse } from "@/types/index";

export function useGpdPositionSnapshots() {
  return useQuery({
    queryKey: ["gpd-position-snapshots"],
    queryFn: () => apiClient<GpdPositionsResponse>("/api/v1/gpd-position/snapshots"),
    staleTime: 60_000,
  });
}

export function useSyncGpdPositions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<GpdPositionSyncResponse>("/api/v1/gpd-position/sync", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gpd-position-snapshots"] }),
  });
}
