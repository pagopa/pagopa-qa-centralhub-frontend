import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api";
import type { PaginatedResponse } from "@/types";
import type {
  FlakyEnv,
  FlakyFilters,
  FlakyHistoryItem,
  FlakyHistoryKey,
  FlakyRecomputeStatus,
  FlakyScenarioKey,
  FlakyScenarioRow,
  FlakySummary,
} from "@/types/flaky";

export const FLAKY_PAGE_SIZE = 50;

export const DEFAULT_FLAKY_FILTERS: FlakyFilters = {
  env: "UAT",
  testObjects: [],
  flag: "all",
  minLevel: null,
  hint: null,
  q: "",
};

export function flakyFiltersToParams(filters: FlakyFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("env", filters.env);
  for (const testObject of filters.testObjects) params.append("test_object", testObject);
  params.set("flag", filters.flag);
  if (filters.minLevel != null) params.set("min_level", String(filters.minLevel));
  if (filters.hint) params.set("hint", filters.hint);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  return params;
}

export function useFlakyScenarios(filters: FlakyFilters, page: number) {
  const params = flakyFiltersToParams(filters);
  params.set("page", String(page));
  params.set("page_size", String(FLAKY_PAGE_SIZE));
  return useQuery({
    queryKey: ["flaky", "scenarios", filters, page],
    queryFn: () => apiClient<PaginatedResponse<FlakyScenarioRow>>(`/api/v1/flaky/scenarios?${params}`),
  });
}

export function useFlakySummary(filters: FlakyFilters) {
  // The hint boxes count every hint, so the hint filter itself is left out.
  const params = flakyFiltersToParams({ ...filters, hint: null });
  return useQuery({
    queryKey: ["flaky", "summary", { ...filters, hint: null }],
    queryFn: () => apiClient<FlakySummary>(`/api/v1/flaky/summary?${params}`),
  });
}

export function useFlakyHistory(key: FlakyHistoryKey | null) {
  const params = new URLSearchParams(key ? { ...key } : {});
  return useQuery({
    queryKey: ["flaky", "history", key],
    enabled: key !== null,
    queryFn: () => apiClient<FlakyHistoryItem[]>(`/api/v1/flaky/scenarios/history?${params}`),
  });
}

export function useFlakyRecomputeStatus() {
  return useQuery({
    queryKey: ["flaky", "recompute-status"],
    queryFn: () => apiClient<FlakyRecomputeStatus | null>("/api/v1/flaky/recompute/status"),
  });
}

function useReviewerEmail(): string {
  const { data: session } = useSession();
  return session?.user?.email ?? "";
}

export function useSetFlakyFlag() {
  const queryClient = useQueryClient();
  const user = useReviewerEmail();
  return useMutation({
    mutationFn: (body: FlakyScenarioKey & { is_flaky: boolean }) =>
      apiClient<unknown>("/api/v1/flaky/scenarios/flag", {
        method: "PUT",
        body: JSON.stringify({ ...body, user }),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["flaky"] });
      // Flags are shared with the NRT/TAS/QG report panels.
      queryClient.invalidateQueries({ queryKey: ["flaky-scenarios"] });
    },
  });
}

export function useRecomputeFlaky() {
  const queryClient = useQueryClient();
  const user = useReviewerEmail();
  return useMutation({
    mutationFn: () =>
      apiClient<FlakyRecomputeStatus>("/api/v1/flaky/recompute", {
        method: "POST",
        body: JSON.stringify({ user }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flaky"] });
    },
  });
}

const FLAKY_ENVS: readonly FlakyEnv[] = ["DEV", "UAT", "PROD"];
const RUN_SCORES_PAGE_SIZE = 200;

export function flakyScoreKey(testType: string, scenarioName: string): string {
  return `${testType}|${scenarioName}`;
}

/** Flakiness of the given scenarios of a run, in the run environment, keyed by type and name. */
export function useRunScenarioScores({
  env,
  testObject,
  scenarioNames,
}: {
  env: string | null | undefined;
  testObject: string;
  scenarioNames: string[];
}) {
  const flakyEnv = FLAKY_ENVS.find((candidate) => candidate === env?.toUpperCase()) ?? null;
  const names = [...new Set(scenarioNames)].sort();
  const enabled = flakyEnv !== null && names.length > 0;
  const query = useQuery({
    queryKey: ["flaky", "run-scores", flakyEnv, testObject, names],
    enabled,
    queryFn: () => {
      const params = new URLSearchParams({
        env: flakyEnv ?? "",
        test_object: testObject,
        flag: "all",
        page: "1",
        page_size: String(RUN_SCORES_PAGE_SIZE),
      });
      for (const name of names) params.append("scenario_name", name);
      return apiClient<PaginatedResponse<FlakyScenarioRow>>(`/api/v1/flaky/scenarios?${params}`);
    },
  });
  const scores = new Map(
    (enabled ? query.data?.items ?? [] : []).map((row) => [flakyScoreKey(row.test_type, row.scenario_name), row]),
  );
  return { scores, env: flakyEnv, isLoading: enabled && query.isLoading };
}
