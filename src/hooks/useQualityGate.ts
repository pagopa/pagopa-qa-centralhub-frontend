import { useEffect } from "react";
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
  return useMutation({
    mutationFn: (request: QualityGateRunRequest) =>
      apiClient<QualityGateRunResponse>("/api/v1/quality-gate/runs", {
        method: "POST",
        body: JSON.stringify(request),
      }),
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

const STATUS_POLL_MS = 10_000;

/**
 * Polls the live state of a launched run until it completes. When it does,
 * the NRT lists and suite cards are refreshed so the new report shows up.
 */
export function useQualityGateRunStatus(correlationId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["quality-gate-run", correlationId],
    enabled: Boolean(correlationId),
    queryFn: () =>
      apiClient<QualityGateRunStatus>(`/api/v1/quality-gate/runs/${correlationId}`),
    refetchInterval: (q) => (q.state.data?.state === "completed" ? false : STATUS_POLL_MS),
  });

  const isCompleted = query.data?.state === "completed";
  useEffect(() => {
    if (isCompleted) {
      void queryClient.invalidateQueries({ queryKey: ["nrts"] });
      void queryClient.invalidateQueries({ queryKey: ["suites"] });
    }
  }, [isCompleted, queryClient]);

  return query;
}
