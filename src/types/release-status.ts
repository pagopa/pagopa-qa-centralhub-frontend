export type Target = "REPO" | "DEV" | "UAT" | "PROD";
export type EnvTarget = "DEV" | "UAT" | "PROD";
export type StatusFilter = "all" | "drift" | "unreachable" | "untested";
export type Area = "CORE" | "TOUCHPOINT";
export type Runtime = "AKS" | "AZ";
export type Ci = "GHA" | "AZDO";
export type AppKind = "backend" | "frontend";
export type Drift = "EQUAL" | "BEHIND" | "AHEAD" | "UNKNOWN";
export type ReadStatus = "OK" | "ERROR" | "EMPTY_BODY" | "NO_VERSION" | "NO_RELEASE";
export type AppFlag = "ALIGNED" | "DRIFT" | "UNREACHABLE" | "UNTESTED";
export type RunKind = "NRT" | "QG" | "TAS";
export type RunOutcome = "PASSED" | "FAILED" | "NEUTRAL";
export type SyncState = "QUEUED" | "RUNNING" | "OK" | "PARTIAL" | "FAILED";
export type SyncTrigger = "SCHEDULED" | "MANUAL";

export interface SyncStatus {
  status: SyncState;
  trigger: SyncTrigger;
  requested_by: string | null;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_success_at: string | null;
  applications_checked: number;
  reads_failed: number;
  errors: unknown[];
  /** QUEUED or RUNNING and not stale (computed by the backend). */
  in_progress: boolean;
}

export interface RunRef {
  run_id: string;
  kind: RunKind;
  outcome: RunOutcome;
  needs_review: boolean;
  trigger_type: string | null;
  timestamp_start: string | null;
  passed: number | null;
  failed: number | null;
  allure_url: string | null;
  gha_run_url: string | null;
  hub_url: string;
}

export interface Cell {
  version: string | null;
  read_status: ReadStatus;
  error_detail: string | null;
  checked_at: string;
  last_ok_at: string | null;
  version_since: string | null;
  drift: Drift | null;
  tests: RunRef[];
}

export interface ApplicationRow {
  id: string;
  name: string;
  product_id: string;
  product_key: string;
  repository: string;
  pipeline_url: string | null;
  runtime: Runtime;
  ci: Ci;
  kind: AppKind;
  test_object: string | null;
  ea_node_id: string | null;
  repo: Cell | null;
  envs: Record<EnvTarget, Cell | null>;
  flags: AppFlag[];
}

export interface ProductGroup {
  id: string;
  name: string;
  applications: ApplicationRow[];
}

export interface AreaGroup {
  area: Area;
  products: ProductGroup[];
}

export interface ReleaseStatus {
  sync: SyncStatus | null;
  areas: AreaGroup[];
}

export interface ReleaseSummary {
  total: number;
  aligned: number;
  drift: number;
  unreachable: number;
  untested: number;
  last_success_at: string | null;
}

export interface DeployEvent {
  version: string;
  previous_version: string | null;
  detected_at: string;
  previous_seen_at: string | null;
  is_baseline: boolean;
  direction: "upgrade" | "rollback" | "unknown" | "baseline";
  runs: RunRef[];
}

export interface ApplicationDetail {
  application: ApplicationRow;
  product_name: string;
  history: Partial<Record<Target, DeployEvent[]>>;
}

export interface Product {
  id: string;
  name: string;
  area: Area;
  application_count: number;
}

export interface ProductInput {
  name: string;
  area: Area;
}

export interface Application {
  id: string;
  product_id: string;
  name: string;
  product_key: string;
  repository: string;
  pipeline_url: string | null;
  runtime: Runtime;
  ci: Ci;
  kind: AppKind;
  test_object: string | null;
  ea_node_id: string | null;
}

export interface ApplicationInput {
  product_id: string;
  name: string;
  product_key: string;
  repository: string;
  pipeline_url?: string | null;
  runtime: Runtime;
  ci: Ci;
  kind: AppKind;
  test_object?: string | null;
  ea_node_id?: string | null;
}

export interface CheckTarget {
  ok: boolean;
  version: string | null;
  detail: string | null;
}

export interface CheckResult {
  repo: CheckTarget;
  envs: Record<string, CheckTarget>;
}

export interface EaComponent {
  id: string;
  name: string;
}
