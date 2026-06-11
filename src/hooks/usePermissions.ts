import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { RoleMatrixResponse } from "@/types/index";

export function useRoleMatrix() {
  return useQuery({
    queryKey: ["role-matrix"],
    queryFn: () => apiClient<RoleMatrixResponse>("/api/v1/roles"),
    staleTime: 5 * 60_000,
  });
}

export function usePermissions() {
  const { data: session } = useSession();
  const { data, isLoading } = useRoleMatrix();
  const role = session?.user?.role;

  function can(action: string): boolean {
    if (!role) return false;
    if (role === "superadmin") return true;
    return data?.matrix[role]?.[action] ?? false;
  }

  const roleLabel = data?.roles.find((r) => r.key === role)?.label ?? role ?? "";

  return { role, roleLabel, can, isLoading: isLoading || !role };
}

export function useUpdateRolePermissions(role: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (permissions: Record<string, boolean>) =>
      apiClient<Record<string, boolean>>(`/api/v1/roles/${role}`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-matrix"] }),
  });
}
