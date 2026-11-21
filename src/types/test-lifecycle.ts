// Mirror of the backend `Tl*` schemas (app/schemas/test_lifecycle.py).
// Decimal fields are serialized as strings by the backend.

export type TlFeatureStatus = "draft" | "in_review" | "designed" | "implemented" | "running";
export type TlRevisionStatus = "draft" | "in_review" | "approved" | "merged" | "superseded";
export type TlScenarioKind = "scenario" | "outline";
export type TlPolarity = "positivo" | "negativo";
export type TlTransitionAction = "submit" | "approve" | "request_changes" | "reopen";
export type TlExtraTag = "runnable" | "e2e" | "ui" | "skip";
export type TlPrState = "open" | "merged" | "closed";
export type TlIssueKind =
  | "structural_change"
  | "new_scenario_from_git"
  | "file_deleted"
  | "unknown_feature_code"
  | "parse_error"
  | "pr_closed_unmerged"
  | "pr_creation_failed"
  | "jira_creation_failed";
export type TlIssueStatus = "open" | "acknowledged" | "resolved";
export type TlStepKeyword = "given" | "when" | "then";
export type TlRebaseSide = "git" | "draft";

export interface TlScope {
  id: string;
  code: string;
  name: string;
  area: string | null;
  repo_folder: string | null;
  owner_team: string | null;
  next_feature_number: number;
  created_at: string;
  updated_at: string;
  feature_count: number;
  status_counts: Record<string, number>;
  jira_qa_epic_key: string | null;
  jira_component: string | null;
}

export interface TlScopeCreate {
  code: string;
  name: string;
  area?: string | null;
  repo_folder?: string | null;
  owner_team?: string | null;
  jira_qa_epic_key?: string | null;
  jira_component?: string | null;
}

export interface TlScopeUpdate {
  code?: string;
  name?: string;
  area?: string | null;
  repo_folder?: string | null;
  owner_team?: string | null;
  jira_qa_epic_key?: string | null;
  jira_component?: string | null;
}

export interface TlExamples {
  headers: string[];
  rows: string[][];
}

export interface TlLineError {
  line: number;
  message: string;
}

export interface TlScenario {
  id: string;
  number: number;
  tag: string;
  position: number;
  title: string;
  kind: TlScenarioKind;
  polarity: TlPolarity;
  extra_tags: string[];
  steps: string;
  examples: TlExamples | null;
  detail_link: string | null;
  errors: TlLineError[];
}

export interface TlRevision {
  id: string;
  number: number;
  status: TlRevisionStatus;
  lock_version: number;
  title: string;
  description: string | null;
  background_steps: string | null;
  requirements_url: string | null;
  product_issue_key: string | null;
  reverse_engineering: boolean;
  design_estimate_days: string | null;
  impl_estimate_days: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  scenarios: TlScenario[];
  background_errors: TlLineError[];
  origin: "hub" | "git";
  pr_number: number | null;
  pr_url: string | null;
  pr_state: TlPrState | null;
  pr_error: string | null;
  base_stale: boolean;
  merged_commit_sha: string | null;
}

/** Result of the transition pre-check, one entry per workflow action. */
export interface TransitionCheck {
  action: TlTransitionAction;
  allowed: boolean;
  reasons: string[];
}

export interface TlFeatureListItem {
  id: string;
  code: string;
  number: number;
  title: string | null;
  status: TlFeatureStatus;
  scope_id: string;
  scope_code: string;
  design_owner_id: string | null;
  reviewer_id: string | null;
  impl_owner_id: string | null;
  scenario_count: number;
  updated_at: string;
}

export interface TlFeatureDetail {
  id: string;
  code: string;
  number: number;
  status: TlFeatureStatus;
  scope_id: string;
  scope_code: string;
  design_owner_id: string | null;
  reviewer_id: string | null;
  impl_owner_id: string | null;
  jira_design_key: string | null;
  jira_impl_key: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  working_revision: TlRevision | null;
  published_revision: TlRevision | null;
  transitions: TransitionCheck[];
  git_path: string | null;
  open_issues: number;
  jira: TlJiraLink[];
  jira_error: string | null;
  jira_qa_epic_key: string | null;
  jira_qa_epic_effective: string | null;
  jira_warning?: string | null;
}

// ── Jira (fase 3) ─────────────────────────────────────────────────────────────

export type TlJiraRole = "design" | "impl" | "qa_epic" | "product";
export type TlJiraCategory = "new" | "indeterminate" | "done";
export type TlJiraTaskKind = "design" | "impl";

export interface TlJiraLink {
  role: TlJiraRole;
  key: string;
  summary: string | null;
  status: string | null;
  category: TlJiraCategory | null;
  url: string | null;
  verified: boolean;
}

export interface TlFeatureFilters {
  scope_id?: string;
  status?: TlFeatureStatus;
  owner_id?: string;
}

export interface TlFeatureCreate {
  scope_id: string;
  title: string;
  design_owner_id?: string | null;
}

export interface TlFeatureUpdate {
  design_owner_id?: string | null;
  reviewer_id?: string | null;
  impl_owner_id?: string | null;
  jira_design_key?: string | null;
  jira_impl_key?: string | null;
  jira_qa_epic_key?: string | null;
}

export interface TlRevisionUpdate {
  lock_version: number;
  title?: string;
  description?: string | null;
  background_steps?: string | null;
  requirements_url?: string | null;
  product_issue_key?: string | null;
  reverse_engineering?: boolean;
  design_estimate_days?: number | string | null;
  impl_estimate_days?: number | string | null;
}

export interface TlScenarioCreate {
  title: string;
  kind?: TlScenarioKind;
  polarity?: TlPolarity;
}

export interface TlScenarioUpdate {
  lock_version: number;
  title?: string;
  kind?: TlScenarioKind;
  polarity?: TlPolarity;
  extra_tags?: string[];
  steps?: string;
  examples?: TlExamples | null;
  detail_link?: string | null;
  position?: number;
}

export interface TlHistoryItem {
  kind: "event" | "version";
  at: string;
  actor: string | null;
  action: string | null;
  detail: Record<string, unknown> | null;
  version_id: string | null;
}

export interface TlVersion {
  id: string;
  feature_id: string;
  revision_id: string;
  origin: string;
  snapshot: Record<string, unknown>;
  commit_sha: string | null;
  actor: string;
  created_at: string;
}

export interface TlComment {
  id: string;
  revision_id: string;
  scenario_id: string | null;
  scenario_tag: string | null;
  author: string;
  body: string;
  resolved: boolean;
  created_at: string;
}

export interface TlCommentCreate {
  body: string;
  scenario_id?: string | null;
}

export interface TlPreviewError {
  scenario_tag: string | null;
  line: number;
  message: string;
}

export interface TlPreview {
  file: string;
  errors: TlPreviewError[];
}

export interface GherkinError {
  line: number;
  message: string;
}

export interface TlGherkinValidateRequest {
  steps: string;
  kind?: TlScenarioKind;
  examples?: TlExamples | null;
  background?: boolean;
}

export interface TlGherkinValidateResult {
  errors: GherkinError[];
}

export type TlErrorCode =
  | "stale_lock"
  | "revision_locked"
  | "transition_not_allowed"
  | "unknown_actor"
  | "not_reviewer"
  | "revision_not_commentable"
  | "scope_code_conflict"
  | "scope_code_locked"
  | "git_not_configured"
  | "github_error"
  | "pr_not_allowed"
  | "pr_in_progress"
  | "repo_folder_missing"
  | "sync_in_progress"
  | "rebase_required"
  | "rebase_not_needed"
  | "issue_already_resolved"
  | "jira_issue_not_found"
  | "jira_not_an_epic"
  | "jira_in_progress"
  | "jira_task_exists"
  | "jira_task_not_allowed"
  | "jira_not_configured"
  | "jira_error";

// ── Git (fase 2) ──────────────────────────────────────────────────────────────

export interface TlIssue {
  id: string;
  feature_id: string | null;
  revision_id: string | null;
  kind: TlIssueKind;
  status: TlIssueStatus;
  path: string | null;
  commit_sha: string | null;
  detail: Record<string, unknown>;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  feature_code: string | null;
  feature_title: string | null;
}

export interface TlIssueFilters {
  status?: TlIssueStatus;
  feature_id?: string;
  kind?: TlIssueKind;
}

export interface TlGitStatus {
  configured: boolean;
  last_main_sha: string | null;
  last_run_at: string | null;
  last_error: string | null;
  last_summary: Record<string, unknown> | null;
}

export interface TlGitSyncSummary {
  prs_merged: number;
  prs_closed: number;
  files_imported: number;
  issues_opened: number;
  steps_indexed: boolean;
  head_sha: string;
  full_resync: boolean;
}

export interface TlScenarioContent {
  position: number;
  title: string;
  kind: TlScenarioKind;
  polarity: TlPolarity;
  extra_tags: string[];
  steps: string;
  examples: TlExamples | null;
  detail_link: string | null;
}

export interface TlRebaseScenario {
  scenario_id: string;
  tag: string;
  base: TlScenarioContent | null;
  git: TlScenarioContent | null;
  draft: TlScenarioContent | null;
  conflict: boolean;
}

export interface TlRebaseField {
  field: "title" | "description" | "background";
  base: string | null;
  git: string | null;
  draft: string | null;
  conflict: boolean;
}

export interface TlRebaseView {
  revision_id: string;
  base_revision_id: string | null;
  published_revision_id: string | null;
  lock_version: number;
  metadata: TlRebaseField[];
  scenarios: TlRebaseScenario[];
}

export interface TlStepSuggestion {
  keyword: TlStepKeyword;
  text: string;
  occurrences: number;
  implemented: boolean;
}
