import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  TlBranchSync,
  TlComment,
  TlDeleteKind,
  TlDeletePreview,
  TlDeleteResult,
  TlCommentCreate,
  TlFeatureCreate,
  TlFeatureDetail,
  TlFeatureFilters,
  TlFeatureListItem,
  TlFeatureNrt,
  TlFeatureUpdate,
  TlGherkinValidateRequest,
  TlGherkinValidateResult,
  TlGitStatus,
  TlGitSyncSummary,
  TlImportGitResult,
  TlHistoryItem,
  TlIssue,
  TlIssueFilters,
  TlJiraLink,
  TlJiraTaskKind,
  TlMigrationDecision,
  TlMigrationItem,
  TlMigrationItemFilters,
  TlMigrationOverrides,
  TlMigrationScope,
  TlMigrationSummary,
  TlNrtRunLink,
  TlRebaseSide,
  TlRebaseView,
  TlStepKeyword,
  TlStepSuggestion,
  TlTagCleanup,
  TlPreview,
  TlRevision,
  TlRevisionUpdate,
  TlScenario,
  TlScenarioCreate,
  TlScenarioUpdate,
  TlScope,
  TlScopeCreate,
  TlScopeUpdate,
  TlTransitionAction,
  TlVersion,
} from "@/types/test-lifecycle";

const BASE = "/api/v1/test-lifecycle";

function useActorEmail(): string | null {
  const { data: session } = useSession();
  return session?.user?.email ?? null;
}

function useInvalidateFeature() {
  const qc = useQueryClient();
  return (featureId: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["tl", "feature", featureId] }),
      qc.invalidateQueries({ queryKey: ["tl", "features"] }),
      qc.invalidateQueries({ queryKey: ["tl", "history", featureId] }),
      qc.invalidateQueries({ queryKey: ["tl", "preview", featureId] }),
      qc.invalidateQueries({ queryKey: ["tl", "issues"] }),
      qc.invalidateQueries({ queryKey: ["tl", "rebase", featureId] }),
      qc.invalidateQueries({ queryKey: ["tl", "branch-sync", featureId] }),
    ]);
}

// ── Scopes ────────────────────────────────────────────────────────────────────

export function useTlScopes() {
  return useQuery<TlScope[]>({
    queryKey: ["tl", "scopes"],
    queryFn: () => apiClient<TlScope[]>(`${BASE}/scopes`),
  });
}

export function useCreateTlScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TlScopeCreate) =>
      apiClient<TlScope>(`${BASE}/scopes`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tl", "scopes"] }),
  });
}

export function useUpdateTlScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & TlScopeUpdate) =>
      apiClient<TlScope>(`${BASE}/scopes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tl", "scopes"] }),
  });
}

// ── Features ──────────────────────────────────────────────────────────────────

export function useTlFeatures(filters: TlFeatureFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return useQuery<TlFeatureListItem[]>({
    queryKey: ["tl", "features", filters],
    queryFn: () => apiClient<TlFeatureListItem[]>(`${BASE}/features${qs ? `?${qs}` : ""}`),
  });
}

export function useTlFeature(id: string | undefined) {
  const actor = useActorEmail();
  return useQuery<TlFeatureDetail>({
    queryKey: ["tl", "feature", id, actor],
    queryFn: () => {
      const qs = actor ? `?${new URLSearchParams({ actor_email: actor })}` : "";
      return apiClient<TlFeatureDetail>(`${BASE}/features/${id}${qs}`);
    },
    enabled: !!id,
  });
}

export function useCreateTlFeature() {
  const qc = useQueryClient();
  const actor = useActorEmail();
  return useMutation({
    mutationFn: (data: TlFeatureCreate) =>
      apiClient<TlFeatureDetail>(`${BASE}/features`, {
        method: "POST",
        body: JSON.stringify({ ...data, actor_email: actor }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tl", "features"] });
      qc.invalidateQueries({ queryKey: ["tl", "scopes"] });
    },
  });
}

export function useUpdateTlFeature() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & TlFeatureUpdate) =>
      apiClient<TlFeatureDetail>(`${BASE}/features/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, actor_email: actor }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.id),
  });
}

// ── Revisions and scenarios ───────────────────────────────────────────────────

export function useUpdateTlRevision() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      featureId,
      revisionId,
      ...data
    }: { featureId: string; revisionId: string } & TlRevisionUpdate) =>
      apiClient<TlRevision>(`${BASE}/features/${featureId}/revisions/${revisionId}`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, actor_email: actor }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

export function useAddTlScenario() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      featureId,
      revisionId,
      ...data
    }: { featureId: string; revisionId: string } & TlScenarioCreate) =>
      apiClient<TlScenario>(`${BASE}/features/${featureId}/revisions/${revisionId}/scenarios`, {
        method: "POST",
        body: JSON.stringify({ ...data, actor_email: actor }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

export function useUpdateTlScenario() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      featureId,
      revisionId,
      scenarioId,
      ...data
    }: { featureId: string; revisionId: string; scenarioId: string } & TlScenarioUpdate) =>
      apiClient<TlScenario>(
        `${BASE}/features/${featureId}/revisions/${revisionId}/scenarios/${scenarioId}`,
        { method: "PATCH", body: JSON.stringify({ ...data, actor_email: actor }) },
      ),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

/** Deletes a scenario; the backend returns the updated revision. */
export function useRemoveTlScenario() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      featureId,
      revisionId,
      scenarioId,
    }: {
      featureId: string;
      revisionId: string;
      scenarioId: string;
    }) => {
      const qs = new URLSearchParams({ actor_email: actor ?? "" });
      return apiClient<TlRevision>(
        `${BASE}/features/${featureId}/revisions/${revisionId}/scenarios/${scenarioId}?${qs}`,
        { method: "DELETE" },
      );
    },
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

// ── Workflow and history ──────────────────────────────────────────────────────

export function useTlTransition() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      featureId,
      revisionId,
      action,
      note,
      branchName,
    }: {
      featureId: string;
      revisionId: string;
      action: TlTransitionAction;
      note?: string | null;
      /** Only for `reopen`: name of the working branch; the backend generates one by default. */
      branchName?: string | null;
    }) =>
      apiClient<TlFeatureDetail>(`${BASE}/features/${featureId}/revisions/${revisionId}/transitions`, {
        method: "POST",
        body: JSON.stringify({
          action,
          actor_email: actor,
          ...(note ? { note } : {}),
          ...(branchName ? { branch_name: branchName } : {}),
        }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

export function useTlHistory(id: string | undefined) {
  return useQuery<TlHistoryItem[]>({
    queryKey: ["tl", "history", id],
    queryFn: () => apiClient<TlHistoryItem[]>(`${BASE}/features/${id}/history`),
    enabled: !!id,
  });
}

export function useTlVersion(featureId: string | undefined, versionId: string | undefined) {
  return useQuery<TlVersion>({
    queryKey: ["tl", "version", featureId, versionId],
    queryFn: () => apiClient<TlVersion>(`${BASE}/features/${featureId}/versions/${versionId}`),
    enabled: !!featureId && !!versionId,
  });
}

// ── Review comments, preview, live validation ─────────────────────────────────

export function useTlComments(featureId: string | undefined, revId: string | undefined) {
  return useQuery<TlComment[]>({
    queryKey: ["tl", "comments", featureId, revId],
    queryFn: () => apiClient<TlComment[]>(`${BASE}/features/${featureId}/revisions/${revId}/comments`),
    enabled: !!featureId && !!revId,
  });
}

export function useAddTlComment() {
  const qc = useQueryClient();
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      featureId,
      revisionId,
      ...data
    }: { featureId: string; revisionId: string } & TlCommentCreate) =>
      apiClient<TlComment>(`${BASE}/features/${featureId}/revisions/${revisionId}/comments`, {
        method: "POST",
        body: JSON.stringify({ ...data, actor_email: actor }),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tl", "comments", vars.featureId, vars.revisionId] });
      invalidate(vars.featureId);
    },
  });
}

export function useResolveTlComment() {
  const qc = useQueryClient();
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      commentId,
      resolved,
    }: {
      commentId: string;
      resolved: boolean;
      featureId: string;
      revisionId: string;
    }) =>
      apiClient<TlComment>(`${BASE}/comments/${commentId}`, {
        method: "PATCH",
        body: JSON.stringify({ resolved, actor_email: actor }),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tl", "comments", vars.featureId, vars.revisionId] });
      invalidate(vars.featureId);
    },
  });
}

export function useTlPreview(featureId: string | undefined, revId: string | undefined) {
  return useQuery<TlPreview>({
    queryKey: ["tl", "preview", featureId, revId],
    queryFn: () => apiClient<TlPreview>(`${BASE}/features/${featureId}/revisions/${revId}/preview`),
    enabled: !!featureId && !!revId,
  });
}

export function useValidateSteps() {
  return useMutation({
    mutationFn: (data: TlGherkinValidateRequest) =>
      apiClient<TlGherkinValidateResult>(`${BASE}/gherkin/validate`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}

// ── Git (fase 2) ──────────────────────────────────────────────────────────────

export function usePublishTlRevision() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({ featureId, revisionId }: { featureId: string; revisionId: string }) =>
      apiClient<TlFeatureDetail>(`${BASE}/features/${featureId}/revisions/${revisionId}/pr`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

export function useTlGitStatus() {
  return useQuery<TlGitStatus>({
    queryKey: ["tl", "git", "status"],
    queryFn: () => apiClient<TlGitStatus>(`${BASE}/git/status`),
  });
}

export function useTlGitSync() {
  const actor = useActorEmail();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<TlGitSyncSummary>(`${BASE}/git/sync`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor }),
      }),
    // il sync può toccare qualsiasi feature: si ricarica tutto il modulo
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tl"] }),
  });
}

export function useTlIssues(filters: TlIssueFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return useQuery<TlIssue[]>({
    queryKey: ["tl", "issues", filters],
    queryFn: () => apiClient<TlIssue[]>(`${BASE}/issues${qs ? `?${qs}` : ""}`),
  });
}

export function useUpdateTlIssue() {
  const actor = useActorEmail();
  const qc = useQueryClient();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      issueId,
      status,
    }: {
      issueId: string;
      status: "acknowledged" | "resolved";
      featureId?: string | null;
    }) =>
      apiClient<TlIssue>(`${BASE}/issues/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, actor_email: actor }),
      }),
    onSuccess: (_d, vars) =>
      vars.featureId
        ? invalidate(vars.featureId)
        : qc.invalidateQueries({ queryKey: ["tl", "issues"] }),
  });
}

export function useTlRebase(featureId: string | undefined, revisionId: string | undefined, enabled = true) {
  return useQuery<TlRebaseView>({
    queryKey: ["tl", "rebase", featureId, revisionId],
    queryFn: () => apiClient<TlRebaseView>(`${BASE}/features/${featureId}/revisions/${revisionId}/rebase`),
    enabled: enabled && !!featureId && !!revisionId,
  });
}

export function useApplyTlRebase() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      featureId,
      revisionId,
      lockVersion,
      choices,
    }: {
      featureId: string;
      revisionId: string;
      lockVersion: number;
      choices: Record<string, TlRebaseSide>;
    }) =>
      apiClient<TlFeatureDetail>(`${BASE}/features/${featureId}/revisions/${revisionId}/rebase`, {
        method: "POST",
        body: JSON.stringify({ lock_version: lockVersion, actor_email: actor, choices }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

export function useTlStepSuggestions(q: string, keyword: TlStepKeyword | null) {
  const query = q.trim();
  const params = new URLSearchParams({ q: query });
  if (keyword) params.set("keyword", keyword);
  params.set("limit", "10");
  return useQuery<TlStepSuggestion[]>({
    queryKey: ["tl", "steps", query, keyword],
    queryFn: () => apiClient<TlStepSuggestion[]>(`${BASE}/steps?${params.toString()}`),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

// ── Jira (fase 3) ─────────────────────────────────────────────────────────────

export function useCreateTlJiraTask() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({ featureId, kind }: { featureId: string; kind: TlJiraTaskKind }) =>
      apiClient<TlFeatureDetail>(`${BASE}/features/${featureId}/jira/${kind}-task`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

export function useRefreshTlJira() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({ featureId }: { featureId: string }) =>
      apiClient<TlFeatureDetail>(`${BASE}/features/${featureId}/jira/refresh`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

export function useCreateTlScopeEpic() {
  const actor = useActorEmail();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scopeId }: { scopeId: string }) =>
      apiClient<TlScope>(`${BASE}/scopes/${scopeId}/jira/epic`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tl", "scopes"] }),
  });
}

/** Epic del progetto QA; `q` va già passato con debounce dal componente. */
export function useTlJiraEpics(q: string, enabled = true) {
  const query = q.trim();
  return useQuery<TlJiraLink[]>({
    queryKey: ["tl", "jira", "epics", query],
    queryFn: () =>
      apiClient<TlJiraLink[]>(`${BASE}/jira/epics?${new URLSearchParams({ q: query }).toString()}`),
    enabled,
    staleTime: 60_000,
  });
}

// ── NRT (fase 4) ──────────────────────────────────────────────────────────────

export function useTlFeatureNrt(featureId: string | undefined) {
  return useQuery<TlFeatureNrt>({
    queryKey: ["tl", "nrt", featureId],
    queryFn: () => apiClient<TlFeatureNrt>(`${BASE}/features/${featureId}/nrt`),
    enabled: !!featureId,
  });
}

/** Feature dell'hub collegate alle esecuzioni di una run NRT/TAS/Quality Gate. */
export function useTlRunLinks(runId: string | undefined, enabled = true) {
  return useQuery<TlNrtRunLink[]>({
    queryKey: ["tl", "run-links", runId],
    queryFn: () => apiClient<TlNrtRunLink[]>(`${BASE}/nrt/runs/${runId}/links`),
    enabled: enabled && !!runId,
  });
}

// ── Tag di categoria e migrazione (fase 5) ────────────────────────────────────

export function useTlCategoryTags() {
  return useQuery<string[]>({
    queryKey: ["tl", "category-tags"],
    queryFn: () => apiClient<string[]>(`${BASE}/category-tags`),
    staleTime: 300_000,
  });
}

export function useTlTagCleanup(featureId: string | undefined) {
  return useQuery<TlTagCleanup>({
    queryKey: ["tl", "tag-cleanup", featureId],
    queryFn: () => apiClient<TlTagCleanup>(`${BASE}/features/${featureId}/tag-cleanup`),
    enabled: !!featureId,
  });
}

export function useApplyTlTagCleanup() {
  const actor = useActorEmail();
  const qc = useQueryClient();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: (featureId: string) =>
      apiClient<TlFeatureDetail>(`${BASE}/features/${featureId}/tag-cleanup`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor }),
      }),
    onSuccess: (_d, featureId) =>
      Promise.all([
        invalidate(featureId),
        qc.invalidateQueries({ queryKey: ["tl", "tag-cleanup", featureId] }),
      ]),
  });
}

export function useTlMigration() {
  const actor = useActorEmail();
  return useQuery<TlMigrationSummary>({
    queryKey: ["tl", "migration", "summary"],
    queryFn: () =>
      apiClient<TlMigrationSummary>(
        `${BASE}/migration?${new URLSearchParams({ actor_email: actor ?? "" }).toString()}`,
      ),
    enabled: !!actor,
  });
}

export function useTlMigrationItems(filters: TlMigrationItemFilters = {}) {
  const actor = useActorEmail();
  const params = new URLSearchParams({ actor_email: actor ?? "" });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, String(value));
  }
  return useQuery<TlMigrationItem[]>({
    queryKey: ["tl", "migration", "items", filters],
    queryFn: () => apiClient<TlMigrationItem[]>(`${BASE}/migration/items?${params.toString()}`),
    enabled: !!actor,
  });
}

function useInvalidateMigration() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["tl", "migration"] });
}

export function useAnalyzeTlMigration() {
  const actor = useActorEmail();
  const invalidate = useInvalidateMigration();
  return useMutation({
    mutationFn: () =>
      apiClient<TlMigrationSummary>(`${BASE}/migration/analyze`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor }),
      }),
    onSuccess: () => invalidate(),
  });
}

export function usePatchTlMigrationItem() {
  const actor = useActorEmail();
  const invalidate = useInvalidateMigration();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      overrides,
    }: {
      id: string;
      decision?: TlMigrationDecision;
      overrides?: TlMigrationOverrides;
    }) =>
      apiClient<TlMigrationItem>(`${BASE}/migration/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ actor_email: actor, decision, overrides }),
      }),
    onSuccess: () => invalidate(),
  });
}

export function usePatchTlMigrationTag() {
  const actor = useActorEmail();
  const invalidate = useInvalidateMigration();
  return useMutation({
    mutationFn: ({ name, decision }: { name: string; decision: "keep" | "drop" }) =>
      apiClient<TlMigrationSummary>(`${BASE}/migration/tags/${encodeURIComponent(name)}`, {
        method: "PATCH",
        body: JSON.stringify({ actor_email: actor, decision }),
      }),
    onSuccess: () => invalidate(),
  });
}

function useScopeAction(action: "execute" | "retry-pr" | "retry-confluence") {
  const actor = useActorEmail();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scopeCode }: { scopeCode: string }) =>
      apiClient<TlMigrationScope>(
        `${BASE}/migration/scopes/${encodeURIComponent(scopeCode)}/${action}`,
        { method: "POST", body: JSON.stringify({ actor_email: actor }) },
      ),
    // l'esecuzione crea feature e ambiti: si ricarica tutto il modulo
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tl"] }),
  });
}

export const useExecuteTlMigrationScope = () => useScopeAction("execute");
export const useRetryTlMigrationPr = () => useScopeAction("retry-pr");
export const useRetryTlMigrationConfluence = () => useScopeAction("retry-confluence");

// ── Importa da Git ────────────────────────────────────────────────────────────

export function useImportTlGit() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      featureId,
      revisionId,
      url,
      lockVersion,
    }: {
      featureId: string;
      revisionId: string;
      url: string;
      lockVersion: number;
    }) =>
      apiClient<TlImportGitResult>(`${BASE}/features/${featureId}/revisions/${revisionId}/import-git`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor, lock_version: lockVersion, url }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

export function useTlBranchSync(
  featureId: string | undefined,
  revisionId: string | undefined,
  enabled: boolean,
) {
  return useQuery<TlBranchSync>({
    queryKey: ["tl", "branch-sync", featureId, revisionId],
    queryFn: () =>
      apiClient<TlBranchSync>(`${BASE}/features/${featureId}/revisions/${revisionId}/git-sync`),
    enabled: enabled && !!featureId && !!revisionId,
  });
}

/** "Salva tutti" towards the repository: one commit of the feature file on the working branch. */
export function usePushTlBranch() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({
      featureId,
      revisionId,
      overwrite = false,
    }: {
      featureId: string;
      revisionId: string;
      overwrite?: boolean;
    }) =>
      apiClient<TlBranchSync>(`${BASE}/features/${featureId}/revisions/${revisionId}/git-sync/push`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor, overwrite }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

/** "Accetta dal repo": replaces the draft content with the file on the working branch. */
export function usePullTlBranch() {
  const actor = useActorEmail();
  const invalidate = useInvalidateFeature();
  return useMutation({
    mutationFn: ({ featureId, revisionId }: { featureId: string; revisionId: string }) =>
      apiClient<TlFeatureDetail>(`${BASE}/features/${featureId}/revisions/${revisionId}/git-sync/pull`, {
        method: "POST",
        body: JSON.stringify({ actor_email: actor }),
      }),
    onSuccess: (_d, vars) => invalidate(vars.featureId),
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

const DELETE_PATH: Record<TlDeleteKind, string> = { feature: "features", scope: "scopes" };

/** What deleting a feature/scope would remove, plus blockers and linked Jira issues. */
export function useTlDeletePreview(kind: TlDeleteKind, id: string | null) {
  return useQuery<TlDeletePreview>({
    queryKey: ["tl", "delete-preview", kind, id],
    queryFn: () => apiClient<TlDeletePreview>(`${BASE}/${DELETE_PATH[kind]}/${id}/delete-preview`),
    enabled: !!id,
    gcTime: 0,
    retry: false,
  });
}

export function useTlDelete(kind: TlDeleteKind) {
  const actor = useActorEmail();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteJiraKeys }: { id: string; deleteJiraKeys: string[] }) =>
      apiClient<TlDeleteResult>(`${BASE}/${DELETE_PATH[kind]}/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ actor_email: actor, delete_jira_keys: deleteJiraKeys }),
      }),
    onSuccess: (_data, { id }) => {
      // The deleted entity's own queries would refetch a 404 and flash an error: drop them.
      qc.removeQueries({ queryKey: ["tl", "delete-preview", kind, id] });
      if (kind === "feature") {
        for (const key of ["feature", "history", "preview"]) qc.removeQueries({ queryKey: ["tl", key, id] });
      }
      // Lists are refreshed in the background so the dialog can show the result immediately.
      for (const key of ["features", "scopes", "issues"]) void qc.invalidateQueries({ queryKey: ["tl", key] });
    },
  });
}
