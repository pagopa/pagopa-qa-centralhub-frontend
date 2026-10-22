import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  EaAssistantReply,
  EaChange,
  EaChatMessage,
  EaChangeDecision,
  EaChangeStatus,
  EaEdgeCreate,
  EaEdgeDetail,
  EaEdgeUpdate,
  EaFlow,
  EaHistoryItem,
  EaInfraEnv,
  EaInfraResourceDetail,
  EaInfraView,
  EaKb,
  EaLive,
  EaLiveEnv,
  EaNodeDetail,
  EaNodeUpdate,
  EaQaUpdate,
  EaReleaseImpact,
  EaReleaseImpactRequest,
  EaSyncRun,
  EaSyncStatus,
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

/* ── Sync & review queue ───────────────────────────────────────── */

const syncKey = [...eaMapQueryKey, "sync"] as const;

/** Polls every 5 s while a sync runs; when it ends, everything EA is refetched. */
export function useEaSyncStatus() {
  const qc = useQueryClient();
  const query = useQuery<EaSyncStatus>({
    queryKey: [...syncKey, "status"],
    queryFn: () => apiClient("/api/v1/ea/sync-status"),
    refetchInterval: (q) => (q.state.data?.running ? 5_000 : 60_000),
  });
  const wasRunning = useRef(false);
  const running = !!query.data?.running;
  useEffect(() => {
    if (wasRunning.current && !running) qc.invalidateQueries({ queryKey: eaMapQueryKey });
    wasRunning.current = running;
  }, [running, qc]);
  return query;
}

export function useTriggerEaSync() {
  return useEaMutation((_: void, actor) => apiClient<EaSyncRun>("/api/v1/ea/sync", json("POST", { actor })));
}

export function useEaSyncRuns(enabled = true) {
  return useQuery<EaSyncRun[]>({
    queryKey: [...syncKey, "runs"],
    queryFn: () => apiClient("/api/v1/ea/sync-runs?limit=10"),
    enabled,
  });
}

export function useEaChanges(statuses: EaChangeStatus[] = ["pending", "conflict"], runId?: string | null, enabled = true) {
  const params = new URLSearchParams({ status: statuses.join(",") });
  if (runId) params.set("run_id", runId);
  return useQuery<EaChange[]>({
    queryKey: [...eaMapQueryKey, "changes", statuses.join(","), runId ?? null],
    queryFn: () => apiClient(`/api/v1/ea/changes?${params.toString()}`),
    enabled,
  });
}

export function useDecideEaChange() {
  return useEaMutation(
    ({ id, approve, ...body }: EaChangeDecision & { id: string; approve: boolean }, actor) =>
      apiClient<EaChange>(`/api/v1/ea/changes/${id}/${approve ? "approve" : "reject"}`, json("POST", { ...body, actor })),
  );
}

export function useBulkDecideEaChanges() {
  return useEaMutation(
    ({ ids, approve, note }: { ids: string[]; approve: boolean; note?: string | null }, actor) =>
      apiClient<Record<string, string>>(
        "/api/v1/ea/changes/bulk",
        json("POST", { ids, decision: approve ? "approve" : "reject", note: note ?? null, actor }),
      ),
  );
}


/** Impact of a pull request or comparison on the platform (read-only, computed on demand). */
export function useEaReleaseImpact() {
  return useMutation<EaReleaseImpact, Error, EaReleaseImpactRequest>({
    mutationFn: (body) => apiClient("/api/v1/ea/impact/release", { method: "POST", body: JSON.stringify(body) }),
  });
}

/** One turn of the map assistant: the whole conversation goes in, the answer comes back. */
export function useEaAssistant() {
  return useMutation<
    EaAssistantReply,
    Error,
    { messages: EaChatMessage[]; context: { view: string; node_id: string | null } | null }
  >({
    mutationFn: (body) => apiClient("/api/v1/ea/assistant/chat", { method: "POST", body: JSON.stringify(body) }),
  });
}


/** Recent outcomes of the automated test runs on the map; refreshed every minute while on. */
export function useEaLive(env: EaLiveEnv, enabled: boolean) {
  return useQuery<EaLive>({
    queryKey: [...eaMapQueryKey, "live", env],
    queryFn: () => apiClient(`/api/v1/ea/live?env=${env}&days=7`),
    enabled,
    refetchInterval: enabled ? 60_000 : false,
    staleTime: 30_000,
  });
}

/** Infrastructure of one environment, from the Terraform of the platform. */
export function useEaInfra(env: EaInfraEnv, enabled = true) {
  return useQuery<EaInfraView>({
    queryKey: [...eaMapQueryKey, "infra", env],
    queryFn: () => apiClient(`/api/v1/ea/infra?env=${env}`),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEaInfraResource(resourceId: string | null) {
  return useQuery<EaInfraResourceDetail>({
    queryKey: [...eaMapQueryKey, "infra-resource", resourceId],
    queryFn: () => apiClient(`/api/v1/ea/infra/resources/${encodeURIComponent(resourceId ?? "")}`),
    enabled: !!resourceId,
  });
}

/** Curated payment flows (SANP) on the map nodes. */
export function useEaFlows() {
  return useQuery<EaFlow[]>({
    queryKey: [...eaMapQueryKey, "flows"],
    queryFn: () => apiClient("/api/v1/ea/flows"),
    staleTime: 5 * 60 * 1000,
  });
}
