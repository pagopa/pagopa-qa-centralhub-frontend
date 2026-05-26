import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { JiraOverview, JiraTrend } from "@/types/index";

export function useJiraOverview() {
  return useQuery<JiraOverview>({
    queryKey: ["jira", "overview"],
    queryFn: () => apiClient("/api/v1/jira/overview"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJiraTrend() {
  return useQuery<JiraTrend>({
    queryKey: ["jira", "trend"],
    queryFn: () => apiClient("/api/v1/jira/trend"),
    staleTime: 5 * 60 * 1000,
  });
}
