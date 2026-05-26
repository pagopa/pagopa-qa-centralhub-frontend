import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { DocItem } from "@/types/index";

const KEY = ["docs"];

export function useDocItems() {
  return useQuery<DocItem[]>({
    queryKey: KEY,
    queryFn: () => apiClient<DocItem[]>("/api/v1/docs"),
  });
}

export function useCreateDocItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<DocItem, "id" | "created_at" | "updated_at">) =>
      apiClient<DocItem>("/api/v1/docs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateDocItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<DocItem> & { id: string }) =>
      apiClient<DocItem>(`/api/v1/docs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDocItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/docs/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
