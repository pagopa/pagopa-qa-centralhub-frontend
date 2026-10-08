import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { SupersetEmbedResult } from "@/types";

export function useGuestToken()  {
  return useQuery({
    queryKey: ["superset", "guest-token"],
    staleTime: 1000 * 60 * 60, // 60 minutes
    queryFn: () => apiClient<string>("/api/v1/superset/guest-token"),
    
  });
}

