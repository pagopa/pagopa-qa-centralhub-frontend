import {useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { NrtSuite } from "@/types";

export function useSuites({ origin }: { origin?: string } = {}) {
   
    return useQuery({
        queryKey: ["suites", { origin }],
        staleTime: 1000 * 60 * 60,// 60 minutes
        queryFn: () => apiClient<string[]>(`/api/v1/suites/all?${new URLSearchParams({ origin: origin ?? "" })}`)
    })
}

