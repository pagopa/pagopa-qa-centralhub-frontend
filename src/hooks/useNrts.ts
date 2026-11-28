import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api";
import type { FlakyScenario, NrtsListObject, NRTSuiteWithLatestRun, PaginatedResponse, TestExecution, UpdateNrtsObject } from "@/types/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface UseNrtsParams {
  test_object?: string;
  origin?: string;
  page?: number;
  pageSize?: number;
}


export function useNrts({test_object, origin, page = 1, pageSize = 20}: UseNrtsParams = {}) {
    const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
    });
    if (test_object) params.set("test_object", test_object);
    if (origin) params.set("origin", origin);
    
    return useQuery({
        queryKey: ["nrts", {test_object, origin, page, pageSize}],
        staleTime: 1000 * 60 * 60, // 60 minute
        queryFn: () => apiClient<PaginatedResponse<NrtsListObject>>(`/api/v1/test-metrics/nrts?${params}`),
    });
}


export function useNrtDetailsScenarios(id?: string) {
    return useQuery({
        queryKey: ["nrts", "details", id],
        enabled: Boolean(id),
        staleTime: 1000 * 60 * 60, // 60 minute
        queryFn: () => {
            if (!id) throw new Error("An NRT ID is required to load its details");
            return apiClient<TestExecution[]>(`/api/v1/test-metrics/nrt/${id}`);
        },
    });
}


export function useRefreshTicketStatuses() {
    return useMutation({
        mutationFn: () => apiClient<{ checked: number; updated: number }>(`/api/v1/test-metrics/nrts/ticket-status/refresh`, {
            method: "POST",
        }),
    });
}

export function useUpdateNrt() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (updatedNrt: UpdateNrtsObject) => apiClient<UpdateNrtsObject>(`/api/v1/test-metrics/nrts/update`, {
            method: "PUT",
            body: JSON.stringify(updatedNrt),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["nrts"] });
        },
    });
}

export function useSaveFlakyScenarios() {
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const user = session?.user?.email ?? undefined;
    return useMutation({
        mutationFn: (flakyScenarios: FlakyScenario[]) => apiClient<FlakyScenario[]>(`/api/v1/test-metrics/flaky-scenarios/save`, {
            method: "POST",
            body: JSON.stringify(flakyScenarios.map((flakyScenario) => ({ ...flakyScenario, user }))),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["flaky-scenarios"] });
            queryClient.invalidateQueries({ queryKey: ["flaky"] });
        },
    });
}

export function useFlakyScenarios({test_object, enabled = true}: {test_object?: string; enabled?: boolean} = {}) {
    const params = new URLSearchParams();
    if (test_object) params.set("test_object", test_object);

    return useQuery({
        queryKey: ["flaky-scenarios", {test_object}],
        enabled,
        staleTime: 1000 * 60 * 60, // 60 minute
        queryFn: () => apiClient<FlakyScenario[]>(`/api/v1/test-metrics/flaky-scenarios?${params}`),
    });
}

export function useNrtsSuites({origin}: {origin?: string} = {}) {
  const params = new URLSearchParams();
  if (origin) params.set("origin", origin);
  return useQuery({
    queryKey: ["nrts", "suites", `${origin}`],
    queryFn: () => apiClient<NRTSuiteWithLatestRun[]>(`/api/v1/test-metrics/nrts-suites?${params}`),
    staleTime: 60_000,
  });
}

export function useNrtsAvgPassRate() {
    return useQuery({
        queryKey: ["nrts", "avg-pass-rate"],
        staleTime: 60_000,
        queryFn: () => apiClient<number>(`/api/v1/test-metrics/avg-pass-rate`),
    });
}
export interface PendingRuns {
    total: number;
    nrt: number;
    qg: number;
}

/** NRT and Quality Gate runs still waiting for review (revision result PENDING). */
export function usePendingRuns() {
    return useQuery({
        queryKey: ["nrts", "pending-runs"],
        staleTime: 60_000,
        queryFn: () => apiClient<PendingRuns>(`/api/v1/test-metrics/pending-runs`),
    });
}
