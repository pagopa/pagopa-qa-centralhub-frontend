import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { UserListResponse, UserRecord, UserUpdate } from "@/types/index";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient<UserListResponse>("/api/v1/users"),
    staleTime: 60_000,
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserUpdate) =>
      apiClient<UserRecord>(`/api/v1/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
