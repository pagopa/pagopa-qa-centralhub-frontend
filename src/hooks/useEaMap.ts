import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  EaEdgeCreate,
  EaEdgeDetail,
  EaEdgeUpdate,
  EaHistoryItem,
  EaKb,
  EaNodeDetail,
  EaNodeUpdate,
  EaQaUpdate,
} from "@/types/ea";

export const eaMapQueryKey = ["ea-map"] as const;

export function useEaKb() {
  return useQuery<EaKb>({
    queryKey: [...eaMapQueryKey, "kb"],
    queryFn: () => apiClient("/api/v1/ea/kb"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEaNodeDetail(nodeId: string | null) {
  return useQuery<EaNodeDetail>({
    queryKey: [...eaMapQueryKey, "node", nodeId],
    queryFn: () => apiClient(`/api/v1/ea/nodes/${encodeURIComponent(nodeId ?? "")}`),
    enabled: !!nodeId,
  });
}

export function useEaNodeHistory(nodeId: string | null, enabled = true) {
  return useQuery<EaHistoryItem[]>({
    queryKey: [...eaMapQueryKey, "history", nodeId],
    queryFn: () => apiClient(`/api/v1/ea/nodes/${encodeURIComponent(nodeId ?? "")}/history`),
    enabled: !!nodeId && enabled,
  });
}

/** Same convention as the other Hub modules: the actor is sent in the body. */
function useActor(): string | null {
  const { data: session } = useSession();
  return session?.user?.email ?? session?.user?.name ?? null;
}

/** Every edit invalidates the whole EA cache: the KB, node details and histories. */
function useEaMutation<TVars, TResult = unknown>(request: (vars: TVars, actor: string | null) => Promise<TResult>) {
  const qc = useQueryClient();
  const actor = useActor();
  return useMutation({
    mutationFn: (vars: TVars) => request(vars, actor),
    onSuccess: () => qc.invalidateQueries({ queryKey: eaMapQueryKey }),
  });
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export function useCreateEaEdge() {
  return useEaMutation((data: EaEdgeCreate, actor) =>
    apiClient<EaEdgeDetail>("/api/v1/ea/edges", json("POST", { ...data, actor })),
  );
}

export function useUpdateEaEdge() {
  return useEaMutation(({ id, ...data }: EaEdgeUpdate & { id: string }, actor) =>
    apiClient<EaEdgeDetail>(`/api/v1/ea/edges/${id}`, json("PATCH", { ...data, actor })),
  );
}

export function useVerifyEaEdge() {
  return useEaMutation(({ id, note }: { id: string; note?: string | null }, actor) =>
    apiClient<EaEdgeDetail>(`/api/v1/ea/edges/${id}/verify`, json("POST", { note: note ?? null, actor })),
  );
}

export function useRemoveEaEdge() {
  return useEaMutation(({ id, note }: { id: string; note?: string | null }, actor) =>
    apiClient<EaEdgeDetail>(`/api/v1/ea/edges/${id}/remove`, json("POST", { note: note ?? null, actor })),
  );
}

export function useUpdateEaNode() {
  return useEaMutation(({ id, ...data }: EaNodeUpdate & { id: string }, actor) =>
    apiClient(`/api/v1/ea/nodes/${encodeURIComponent(id)}`, json("PATCH", { ...data, actor })),
  );
}

export function useUpdateEaQa() {
  return useEaMutation(({ id, ...data }: EaQaUpdate & { id: string }, actor) =>
    apiClient(`/api/v1/ea/nodes/${encodeURIComponent(id)}/qa`, json("PATCH", { ...data, actor })),
  );
}

/** FastAPI puts a human message in `detail` for 4xx answers. */
export function eaErrorMessage(error: unknown): string | null {
  if (!error) return null;
  const body = (error as { body?: { detail?: unknown } }).body;
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) return "Dati non validi";
  return "Operazione non riuscita, riprova";
}
