import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { E2eSuiteWithLatestRun } from "@/types/index";

export function useE2eSuites() {
  return useQuery({
    queryKey: ["e2e", "suites"],
    queryFn: () => apiClient<E2eSuiteWithLatestRun[]>("/api/v1/e2e/suites"),
    staleTime: 60_000,
  });
}
