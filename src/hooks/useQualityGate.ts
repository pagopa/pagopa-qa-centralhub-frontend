import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export type QualityGateTestType = "integration" | "e2e" | "api";
export type QualityGateEnvironment = "dev" | "uat";

export interface QualityGateRunRequest {
  test_suite: string;
  test_type: QualityGateTestType;
  environment: QualityGateEnvironment;
  tags: string;
  allure: boolean;
}

export interface QualityGateRunResponse {
  correlation_id: string;
  run_name: string;
  actions_url: string;
}

export function useLaunchQualityGateRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: QualityGateRunRequest) =>
      apiClient<QualityGateRunResponse>("/api/v1/quality-gate/runs", {
        method: "POST",
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quality-gate-runs"] });
    },
  });
}

export type QualityGateRunState = "pending" | "queued" | "in_progress" | "completed";

export interface QualityGateRunStatus {
  correlation_id: string;
  run_name: string;
  state: QualityGateRunState;
  /** success | failure | cancelled | ... — only set once state is "completed". */
  conclusion: string | null;
  html_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const RUNS_POLL_MS = 10_000;

/**
 * Quality Gate runs launched from the Hub that are active or recent (read from GitHub).
 * Polls every 10 seconds while a run is active, or while a just-launched run
 * (`pendingCorrelationId`) has not been listed by GitHub yet. When a run that was
 * active completes, the NRT lists and suite cards are refreshed to show its report.
 */
export function useQualityGateRuns(pendingCorrelationId?: string) {
  const queryClient = useQueryClient();
  const previouslyActive = useRef<Set<string>>(new Set());
  const query = useQuery({
    queryKey: ["quality-gate-runs"],
    queryFn: () => apiClient<QualityGateRunStatus[]>("/api/v1/quality-gate/runs"),
    refetchInterval: (q) => {
      const runs = q.state.data ?? [];
      const hasActive = runs.some((r) => r.state !== "completed");
      const awaitingListing =
        pendingCorrelationId !== undefined &&
        !runs.some((r) => r.correlation_id === pendingCorrelationId);
      return hasActive || awaitingListing ? RUNS_POLL_MS : false;
    },
  });

  useEffect(() => {
    if (!query.data) return;
    const active = new Set(query.data.filter((r) => r.state !== "completed").map((r) => r.correlation_id));
    const justCompleted = [...previouslyActive.current].some((id) => !active.has(id));
    previouslyActive.current = active;
    if (justCompleted) {
      void queryClient.invalidateQueries({ queryKey: ["nrts"] });
      void queryClient.invalidateQueries({ queryKey: ["suites"] });
    }
  }, [query.data, queryClient]);

  return query;
}

/** Deletes a Quality Gate test run (the backend refuses any other origin). */
export function useDeleteQualityGateRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) =>
      apiClient<void>(`/api/v1/quality-gate/test-runs/${runId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nrts"] });
      void queryClient.invalidateQueries({ queryKey: ["suites"] });
    },
  });
}
