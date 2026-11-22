import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/usePermissions";
import { apiClient } from "@/lib/api";
import type { InboxPage, InboxSummary, Severity } from "@/types/messaging";

const BASE = "/api/v1/messaging";
const PAGE_SIZE = 30;
const SUMMARY_REFRESH_MS = 60_000;

export interface InboxFilters {
  unreadOnly: boolean;
  severity: Severity | "all";
  type: string | "all";
}

export const DEFAULT_INBOX_FILTERS: InboxFilters = { unreadOnly: false, severity: "all", type: "all" };

export function inboxFiltersToParams(filters: InboxFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.unreadOnly) params.set("unread_only", "true");
  if (filters.severity !== "all") params.set("severity", filters.severity);
  if (filters.type !== "all") params.set("type", filters.type);
  return params;
}

/**
 * The backend does not verify JWTs yet, so the inbox routes identify the user through the session
 * email in `X-User-Email`. Requests wait for the email and for the `view:inbox` permission.
 */
function useInboxAccess(): { headers: Record<string, string>; enabled: boolean } {
  const { data: session } = useSession();
  const { can } = usePermissions();
  const email = session?.user?.email ?? undefined;
  return {
    headers: email ? { "X-User-Email": email } : {},
    enabled: Boolean(email) && can("view:inbox"),
  };
}

export function useInboxSummary() {
  const { headers, enabled } = useInboxAccess();
  return useQuery({
    queryKey: ["inbox", "summary"],
    queryFn: () => apiClient<InboxSummary>(`${BASE}/inbox/summary`, { headers }),
    enabled,
    refetchInterval: SUMMARY_REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useInbox(filters: InboxFilters) {
  const { headers, enabled } = useInboxAccess();
  return useInfiniteQuery({
    queryKey: ["inbox", "list", filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = inboxFiltersToParams(filters);
      params.set("limit", String(PAGE_SIZE));
      if (pageParam) params.set("cursor", pageParam);
      return apiClient<InboxPage>(`${BASE}/inbox?${params.toString()}`, { headers });
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  const { headers } = useInboxAccess();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ updated: number }>(`${BASE}/inbox/${id}/read`, { method: "POST", headers }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { headers } = useInboxAccess();
  return useMutation({
    mutationFn: () =>
      apiClient<{ updated: number }>(`${BASE}/inbox/read-all`, { method: "POST", headers }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });
}
