import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { E2eRunWithSuite, PaginatedResponse } from "@/types/index";

interface UseE2eRunsParams {
  suiteId?: string;
  page?: number;
  pageSize?: number;
}

export function useE2eRuns({ suiteId, page = 1, pageSize = 50 }: UseE2eRunsParams = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (suiteId) params.set("suite_id", suiteId);

  return useQuery({
    queryKey: ["e2e", "runs", { suiteId, page, pageSize }],
    queryFn: () =>
      apiClient<PaginatedResponse<E2eRunWithSuite>>(`/api/v1/e2e/runs?${params}`),
    staleTime: 60_000,
  });
}
