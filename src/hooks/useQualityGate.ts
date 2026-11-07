import { useMutation } from "@tanstack/react-query";
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
