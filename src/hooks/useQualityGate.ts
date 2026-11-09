import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { QualityGateRunDetail } from "@/utils/qualityGateReport";

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

export interface QualityGateScenario {
  id: string;
  scenario_name: string | null;
  /** PASSED | FAILED | BROKEN | SKIPPED (upper case, as stored). */
  status: string | null;
  duration_ms: number | null;
  retries: number | null;
  error_message: string | null;
  allure_url: string | null;
}

/** All scenarios of a Quality Gate run (passed ones included), used by the run report. */
export function useQualityGateRunScenarios(runId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["quality-gate-run-scenarios", runId],
    enabled: enabled && Boolean(runId),
    staleTime: 60_000,
    queryFn: () =>
      apiClient<QualityGateScenario[]>(`/api/v1/quality-gate/test-runs/${runId}/scenarios`),
  });
}

/** A single Quality Gate run with its suite: backs the shareable report page. */
export function useQualityGateRun(runId: string | undefined) {
  return useQuery({
    queryKey: ["quality-gate-run", runId],
    enabled: Boolean(runId),
    staleTime: 60_000,
    retry: false,
    queryFn: () => apiClient<QualityGateRunDetail>(`/api/v1/quality-gate/test-runs/${runId}`),
  });
}

export interface QualityGateSuites {
  /** False when the backend could not read the TAS repository: do not restrict the choice then. */
  available: boolean;
  /** Launchable suites with the test types each one has. */
  suites: Record<string, QualityGateTestType[]>;
}

/** Suites that exist in the TAS repository with their test types, for the launch form. */
export function useQualityGateSuites() {
  return useQuery({
    queryKey: ["quality-gate-suites"],
    staleTime: 60_000,
    queryFn: () => apiClient<QualityGateSuites>("/api/v1/quality-gate/suites"),
  });
}
