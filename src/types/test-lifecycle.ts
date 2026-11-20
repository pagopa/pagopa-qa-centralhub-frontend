// Mirror of the backend `Tl*` schemas (app/schemas/test_lifecycle.py).
// Decimal fields are serialized as strings by the backend.

export type TlFeatureStatus = "draft" | "in_review" | "designed" | "implemented" | "running";
export type TlRevisionStatus = "draft" | "in_review" | "approved" | "merged" | "superseded";
export type TlScenarioKind = "scenario" | "outline";
export type TlPolarity = "positivo" | "negativo";
export type TlTransitionAction = "submit" | "approve" | "request_changes" | "reopen";
export type TlExtraTag = "runnable" | "e2e" | "ui" | "skip";

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
}

export interface TlScopeCreate {
  code: string;
  name: string;
  area?: string | null;
  repo_folder?: string | null;
  owner_team?: string | null;
}

export interface TlScopeUpdate {
  code?: string;
  name?: string;
  area?: string | null;
  repo_folder?: string | null;
  owner_team?: string | null;
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
  | "scope_code_locked";
