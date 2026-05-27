import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { JiraOverview, JiraTrend } from "@/types/index";

export function useJiraOverview() {
  return useQuery<JiraOverview>({
    queryKey: ["jira", "testing", "overview"],
    queryFn: () => apiClient("/api/v1/jira/overview"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJiraTrend() {
  return useQuery<JiraTrend>({
    queryKey: ["jira", "testing", "trend"],
    queryFn: () => apiClient("/api/v1/jira/trend"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJiraSanpOverview() {
  return useQuery<JiraOverview>({
    queryKey: ["jira", "sanp", "overview"],
    queryFn: () => apiClient("/api/v1/jira/sanp/overview"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJiraSanpTrend() {
  return useQuery<JiraTrend>({
    queryKey: ["jira", "sanp", "trend"],
    queryFn: () => apiClient("/api/v1/jira/sanp/trend"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJiraDataOverview() {
  return useQuery<JiraOverview>({
    queryKey: ["jira", "data", "overview"],
    queryFn: () => apiClient("/api/v1/jira/data/overview"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJiraDataTrend() {
  return useQuery<JiraTrend>({
    queryKey: ["jira", "data", "trend"],
    queryFn: () => apiClient("/api/v1/jira/data/trend"),
    staleTime: 5 * 60 * 1000,
  });
}
