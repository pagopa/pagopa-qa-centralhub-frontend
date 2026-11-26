// Mirror of the backend `Tl*` schemas (app/schemas/test_lifecycle.py).
// Decimal fields are serialized as strings by the backend.

export type TlFeatureStatus = "draft" | "in_review" | "designed" | "implemented" | "running";
export type TlRevisionStatus = "draft" | "in_review" | "approved" | "merged" | "superseded";
export type TlScenarioKind = "scenario" | "outline";
export type TlPolarity = "positivo" | "negativo";
export type TlTestType = "integration" | "e2e" | "api";
export type TlTransitionAction =
  | "submit"
  | "approve"
  | "request_changes"
  | "reopen"
  | "withdraw_approval"
  | "withdraw";
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
  nrt_pass_rate?: number | null;
  /** False when a feature of the scope is published on Git or has an open PR. */
  deletable: boolean;
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
  /** Working branch in the central repository (import, reopen, approval); null for a hub-only draft. */
  work_branch: string | null;
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
  test_type: TlTestType | null;
  scenario_count: number;
  updated_at: string;
  /** False when the feature is published on Git or has an open PR. */
  deletable: boolean;
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
  test_type: TlTestType | null;
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
  jira_history: TlJiraHistoryRow[];
  jira_error: string | null;
  jira_qa_epic_key: string | null;
  jira_qa_epic_effective: string | null;
  jira_warning?: string | null;
  migration_note?: string | null;
  migrated_from?: TlMigratedFrom | null;
  alignment_pending?: boolean;
  import_source?: TlImportSource | null;
}

export interface TlImportCleanup {
  state: "pending" | "open" | "not_needed" | "error";
  pr_number: number | null;
  pr_url: string | null;
  error: string | null;
  note: string | null;
}

export interface TlImportSource {
  url: string;
  branch: string;
  path: string;
  blob_sha: string;
  imported_at: string;
  /** Only present on features imported before the cleanup PR was removed. */
  cleanup?: TlImportCleanup;
}

export interface TlImportGitResult {
  feature: TlFeatureDetail;
  ignored_tags: string[];
  replaced: number;
}

export interface TlMigratedFrom {
  page_id: string | null;
  page_url: string | null;
  file_path: string | null;
  commit_sha: string | null;
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

/** Jira tasks and epic used by one revision of a feature (newest revision first). */
export interface TlJiraHistoryRow {
  revision_number: number;
  revision_status: TlRevisionStatus;
  is_current: boolean;
  design: TlJiraLink | null;
  impl: TlJiraLink | null;
  qa_epic: TlJiraLink | null;
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
  test_type?: TlTestType | null;
}

export interface TlFeatureUpdate {
  test_type?: TlTestType | null;
  design_owner_id?: string | null;
  reviewer_id?: string | null;
  impl_owner_id?: string | null;
  jira_design_key?: string | null;
  jira_impl_key?: string | null;
  jira_qa_epic_key?: string | null;
  migration_note?: string | null;
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

// ── NRT (fase 4) ──────────────────────────────────────────────────────────────

export type TlNrtStatus = "PASSED" | "FAILED" | "BROKEN" | "SKIPPED";

export interface TlNrtEnvResult {
  env: string;
  status: TlNrtStatus;
  run_id: string;
  run_at: string | null;
  allure_url: string | null;
  origin: string | null;
}

export interface TlScenarioNrt {
  scenario_id: string;
  number: number;
  tag: string;
  title: string;
  envs: TlNrtEnvResult[];
  pass_rate: number | null;
  runs: number;
  flaky: boolean;
  last_run_at: string | null;
}

export interface TlFeatureNrt {
  feature_id: string;
  last_run_at: string | null;
  pass_rate: number | null;
  scenarios: TlScenarioNrt[];
}

export interface TlNrtRunLink {
  execution_id: string;
  feature_id: string;
  feature_code: string;
  scenario_tag: string;
}

// ── Migrazione da Confluence (fase 5) ─────────────────────────────────────────

export type TlMigrationDecision = "pending" | "confirmed" | "excluded";

export interface TlMigrationProblem {
  code: string;
  message: string;
}

export interface TlMigrationOverrides {
  scope_code?: string;
  number?: number;
  title?: string;
  status?: TlFeatureStatus;
  owner_id?: string | null;
  reviewer_id?: string | null;
  file_path?: string | null;
}

export interface TlMigrationEffective {
  scope_code: string;
  number: number | null;
  title: string;
  status: TlFeatureStatus;
  owner_id: string | null;
  reviewer_id: string | null;
  file_path: string | null;
}

export interface TlMigrationItem {
  id: string;
  page_id: string | null;
  page_title: string | null;
  page_url: string | null;
  file_path: string | null;
  scope_code: string;
  number: number | null;
  title: string;
  status: TlFeatureStatus;
  decision: TlMigrationDecision;
  problems: TlMigrationProblem[];
  proposal: Record<string, unknown>;
  overrides: TlMigrationOverrides;
  effective: TlMigrationEffective;
  feature_id: string | null;
  executed_at: string | null;
}

export interface TlMigrationScope {
  scope_code: string;
  items: number;
  pending: number;
  confirmed: number;
  excluded: number;
  executed: number;
  with_problems: number;
  executed_at: string | null;
  pr_number: number | null;
  pr_url: string | null;
  pr_state: string | null;
  pr_error: string | null;
  confluence_errors: { page_id: string | null; message: string }[];
}

export interface TlMigrationTag {
  name: string;
  occurrences: number;
  decision: "keep" | "drop";
  category: boolean;
}

export interface TlMigrationSummary {
  status: "idle" | "running" | "error";
  analyzed_at: string | null;
  error: string | null;
  confluence_write: boolean;
  scopes: TlMigrationScope[];
  tags: TlMigrationTag[];
}

export interface TlMigrationItemFilters {
  scope_code?: string;
  decision?: TlMigrationDecision | "executed";
  problem?: string;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export interface TlDeleteJiraIssue {
  key: string;
  role: "design" | "impl" | "qa_epic";
  summary: string | null;
  status: string | null;
  url: string | null;
  feature_code: string | null;
  default_selected: boolean;
}

export interface TlDeleteBlocker {
  feature_id: string;
  code: string;
  reason: "published" | "pr_open";
}

export interface TlDeletePreview {
  deletable: boolean;
  blockers: TlDeleteBlocker[];
  features: { id: string; code: string; title: string | null }[];
  scenario_count: number;
  jira_issues: TlDeleteJiraIssue[];
}

export interface TlJiraDeleteResult {
  key: string;
  status: "deleted" | "failed";
  reason: string | null;
}

export interface TlDeleteResult {
  deleted_features: number;
  jira_results: TlJiraDeleteResult[];
}

export type TlDeleteKind = "feature" | "scope";

/** A scenario that carries test-type tags (they belong to the file). */
export interface TlTagCleanupRow {
  scenario_tag: string;
  tags: string[];
}

export interface TlTagCleanup {
  rows: TlTagCleanupRow[];
  proposed_test_type: TlTestType | null;
  /** Why the cleanup cannot be applied (disagreeing types); null when it can. */
  conflict: string | null;
}

/** Comparison of a draft with its working branch (backend `GET .../git-sync`). */
export type TlBranchSyncState =
  | "no_branch"
  | "branch_missing"
  | "file_missing"
  | "in_sync"
  | "hub_ahead"
  | "repo_ahead"
  | "diverged"
  | "unreachable"
  | "not_configured";

export interface TlBranchSync {
  branch: string | null;
  state: TlBranchSyncState;
  /** The hub content is not on the repository yet. */
  hub_unsynced: boolean;
  /** The file on the branch changed since the last sync. */
  repo_changed: boolean;
  compare_url: string | null;
}
