import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { FeatureVisibilityResponse } from "@/types/index";

export const featureVisibilityQueryKey = ["feature-visibility"] as const;

export function useFeatureVisibility(enabled = true) {
  return useQuery<FeatureVisibilityResponse>({
    queryKey: featureVisibilityQueryKey,
    queryFn: () => apiClient<FeatureVisibilityResponse>("/api/v1/features"),
    enabled,
  });
}

export function useUpdateFeatureVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      apiClient<{ key: string; enabled: boolean }>(`/api/v1/features/${key}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<FeatureVisibilityResponse>(featureVisibilityQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) =>
            item.key === updated.key ? { ...item, enabled: updated.enabled } : item,
          ),
        };
      });
    },
  });
}
