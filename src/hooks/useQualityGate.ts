import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { RunOrigin } from "@/utils/nrtUtils";
import type { QualityGateRunDetail, RunReportKind } from "@/utils/qualityGateReport";

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

/** Where the runs of each origin are launched, followed and deleted. */
const RUN_API: Record<RunOrigin, string> = {
  QG: "/api/v1/quality-gate",
  TAS: "/api/v1/test-metrics/tas",
  NRT: "/api/v1/test-metrics/nrts",
};

export interface NrtRunRequest {
  /** "all" runs every suite configured for the environment. */
  suites: "all" | string[];
  target_env: QualityGateEnvironment;
}

/** Launches a run of the given origin; `T` is the request body of that origin. */
export function useLaunchRun<T = QualityGateRunRequest>(origin: RunOrigin) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: T) =>
      apiClient<QualityGateRunResponse>(`${RUN_API[origin]}/runs`, {
        method: "POST",
        body: JSON.stringify(request),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs", origin] });
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
 * Runs of an origin launched from the Hub that are active or recent (read from GitHub).
 * Polls every 10 seconds while a run is active, or while a just-launched run
 * (`pendingCorrelationId`) has not been listed by GitHub yet. When a run that was
 * active completes, the NRT lists and suite cards are refreshed to show its report.
 */
export function useRuns(origin: RunOrigin, pendingCorrelationId?: string) {
  const queryClient = useQueryClient();
  const previouslyActive = useRef<Set<string>>(new Set());
  const query = useQuery({
    queryKey: ["runs", origin],
    queryFn: () => apiClient<QualityGateRunStatus[]>(`${RUN_API[origin]}/runs`),
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

/** Deletes a test run of the given origin (the backend refuses runs of any other origin). */
export function useDeleteRun(origin: RunOrigin) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) =>
      apiClient<void>(`${RUN_API[origin]}/test-runs/${runId}`, { method: "DELETE" }),
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

/** Where each kind of run report reads its run and scenarios. */
const RUN_REPORT_API: Record<RunReportKind, string> = {
  qg: "/api/v1/quality-gate/test-runs",
  tas: "/api/v1/test-metrics/tas/test-runs",
  nrt: "/api/v1/test-metrics/nrts/test-runs",
};

/** All scenarios of a run (passed ones included), for the Quality Gate, TAS or NRT report. */
export function useRunReportScenarios(kind: RunReportKind, runId: string | undefined) {
  return useQuery({
    queryKey: ["run-report-scenarios", kind, runId],
    enabled: Boolean(runId),
    staleTime: 60_000,
    queryFn: () => apiClient<QualityGateScenario[]>(`${RUN_REPORT_API[kind]}/${runId}/scenarios`),
  });
}

/** A single run with its suite: backs the shareable report page of each kind. */
export function useRunReport(kind: RunReportKind, runId: string | undefined) {
  return useQuery({
    queryKey: ["run-report", kind, runId],
    enabled: Boolean(runId),
    staleTime: 60_000,
    retry: false,
    queryFn: () => apiClient<QualityGateRunDetail>(`${RUN_REPORT_API[kind]}/${runId}`),
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

export interface NrtLaunchOptions {
  /** False when the backend could not read the NRT registry: do not restrict the choice then. */
  available: boolean;
  suites: { id: string; label: string; envs: string[] }[];
}

/** Suites the NRT workflow can run, with the environments each one supports. */
export function useNrtLaunchOptions() {
  return useQuery({
    queryKey: ["nrt-launch-options"],
    staleTime: 60_000,
    queryFn: () => apiClient<NrtLaunchOptions>(`${RUN_API.NRT}/launch-options`),
  });
}
