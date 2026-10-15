import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { EaKb } from "@/types/ea";

export const eaMapQueryKey = ["ea-map"] as const;

export function useEaKb() {
  return useQuery<EaKb>({
    queryKey: [...eaMapQueryKey, "kb"],
    queryFn: () => apiClient("/api/v1/ea/kb"),
    staleTime: 5 * 60 * 1000,
  });
}
