import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { NrtsListObject, NrtDetailsObject, PaginatedResponse, UpdateNrtsObject, FlakyScenario, TestExecution } from "@/types/index";

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
    return useMutation({
        mutationFn: (flakyScenarios: FlakyScenario[]) => apiClient<FlakyScenario[]>(`/api/v1/test-metrics/flaky-scenarios/save`, {
            method: "POST",
            body: JSON.stringify(flakyScenarios),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["flaky-scenarios"] });
        },
    });
}

export function useFlakyScenarios({test_object}: {test_object?: string} = {}) {
    const params = new URLSearchParams();
    if (test_object) params.set("test_object", test_object);

    return useQuery({
        queryKey: ["flaky-scenarios", {test_object}],
        staleTime: 1000 * 60 * 60, // 60 minute
        queryFn: () => apiClient<FlakyScenario[]>(`/api/v1/test-metrics/flaky-scenarios?${params}`),
    });
}

