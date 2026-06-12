// Domain types — will be replaced by OpenAPI-generated types once the backend
// serves /openapi.json. Generate with: pnpm openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts

export type RunStatus = "passed" | "failed" | "flaky" | "running" | "skipped";
export type Priority = "p1" | "p2" | "p3" | "p4";
export type Environment = "UAT" | "PROD" | "STAGING";

export interface Run {
  id: string;
  suiteId: string;
  suiteName: string;
  status: RunStatus;
  environment: Environment;
  branch?: string;
  commitSha?: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  startedAt: string;
  finishedAt?: string;
}

export interface CoverageEntry {
  id: string;
  component: string;
  linePct: number;
  branchPct: number;
  functionPct: number;
  recordedAt: string;
}

export interface Bug {
  id: string;
  jiraKey: string;
  title: string;
  status: string;
  priority: Priority;
  component?: string;
  assignee?: string;
  environment?: Environment;
  reportedAt: string;
  resolvedAt?: string;
}

export interface Release {
  id: string;
  version: string;
  status: "planned" | "in_progress" | "released" | "rolled_back";
  changelog?: string;
  environment: Environment;
  releasedAt?: string;
}

export interface KpiCard {
  label: string;
  value: string | number;
  delta?: number;
  trend?: number[];
  status?: "success" | "danger" | "warning" | "info";
}

export interface HealthResponse {
  status: "ok";
  version: string;
}

// E2E integration types
export type E2eRunStatus = "passed" | "failed" | "mixed";

export interface E2eSuite {
  id: string;
  name: string;
  display_name: string;
  suite_path: string;
  github_repo: string;
  enabled: boolean;
  sync_lookback_days: number | null;
  last_synced_at: string | null;
}

export interface E2eRun {
  id: string;
  suite_id: string;
  run_at: string;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  allure_url: string;
  status: E2eRunStatus;
  synced_at: string;
}

export interface E2eRunWithSuite extends E2eRun {
  suite_name: string;
  suite_display_name: string;
}

export interface E2eSuiteWithLatestRun {
  suite: E2eSuite;
  latest_run: E2eRun | null;
  trend: number[];
}

// Jira types
export interface NameCount { name: string; count: number }
export interface TypeCount { name: string; count: number; phase: string }
export interface JiraAlert { key: string; summary: string; status: string; days: number }

export interface JiraOverview {
  total: number
  by_status: NameCount[]
  by_component: NameCount[]
  by_type: TypeCount[]
  by_assignee: NameCount[]
  alerts_no_estimate: JiraAlert[]
  alerts_backlog_old: JiraAlert[]
  alerts_blocked_old: JiraAlert[]
  alerts_open_old: JiraAlert[]
  alerts_in_progress_old: JiraAlert[]
}

export interface TrendWeek {
  week: string
  label: string
  created: number
  closed: number
}

export interface JiraTrend { weeks: TrendWeek[] }

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// BDD Generator types
export type BddStatus = "draft" | "reviewed" | "approved";
export type BddSourceType = "text" | "url" | "confluence" | "pdf" | "docx";
export type BddAiProvider = "claude" | "ollama";

export interface BddProject {
  id: string;
  name: string;
  description: string | null;
  scenario_count: number;
  created_at: string;
  updated_at: string;
}

export interface BddScenario {
  id: string;
  project_id: string;
  title: string;
  requirement: string;
  source_type: BddSourceType;
  source_ref: string | null;
  gherkin: string;
  tags: string[];
  status: BddStatus;
  ai_provider: BddAiProvider;
  ai_model: string;
  generation_time_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface BddSettings {
  ai_provider: BddAiProvider;
  claude_api_key_set: boolean;
  claude_model: string;
  ollama_base_url: string;
  ollama_model: string;
  confluence_email: string | null;
  confluence_token_set: boolean;
  gherkin_language: string;
  max_scenarios: number;
}

export interface BddGeneratedScenario {
  title: string;
  gherkin: string;
}

export interface OllamaStatus {
  running: boolean;
  url: string;
}

export type DocType = "external" | "embedded";
export type DocIcon = "confluence" | "page" | "template" | "web" | "video";

export interface DocItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: DocType;
  category: string;
  icon: DocIcon;
  thumbnail_url: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

// PSP Fee catalog types (Data Hub)
export interface PspFeeService {
  id: string;
  psp_id: string;
  psp_rag_soc: string;
  codice_abi: string;
  nome_servizio: string;
  descrizione_canale_mod_pag: string;
  inf_desc_serv: string;
  inf_url_canale: string | null;
  url_informazioni_psp: string | null;
  tipo_vers_cod: string;
  canale_mod_pag: string;
  canale_mod_pag_code: number;
  importo_minimo: number | null;
  importo_massimo: number | null;
  costo_fisso: number | null;
  on_us: boolean;
  carte: boolean;
  conto: boolean;
  altri_wisp: boolean;
  altri_io: boolean;
  conto_app: boolean;
  carte_app: boolean;
  is_duplicated: boolean;
}

export interface PspFeeSyncStatus {
  last_run: string;
  notebook_version: string;
  item_count: number;
  synced_at: string;
}

export interface PspFeeListResponse {
  items: PspFeeService[];
  sync_status: PspFeeSyncStatus | null;
}

export interface PspFeeSyncResponse {
  status: string;
  item_count: number;
}

// GPD Position snapshots (Data Hub)
export interface GpdPositionSnapshot {
  report_date: string;
  total: number;
  gpd: number;
  gpd_payable: number;
  gpd4aca: number;
  gpd4aca_payable: number;
  wisp: number;
  pa_create_position: number;
  pa_create_position_payable: number;
}

export interface GpdPositionSyncStatus {
  item_count: number;
  synced_at: string;
}

export interface GpdPositionsResponse {
  items: GpdPositionSnapshot[];
  sync_status: GpdPositionSyncStatus | null;
}

export interface GpdPositionSyncResponse {
  status: string;
  item_count: number;
}

// Users & roles (Auth/RBAC)
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  items: UserRecord[];
}

export interface UserUpdate {
  role?: string;
  is_active?: boolean;
}

export interface ActionCatalogEntry {
  key: string;
  label: string;
  category: string;
}

export interface RoleOut {
  key: string;
  label: string;
  is_system: boolean;
}

export interface RoleMatrixResponse {
  roles: RoleOut[];
  catalog: ActionCatalogEntry[];
  matrix: Record<string, Record<string, boolean>>;
}

export interface SyncLoginResponse {
  role: string;
  is_active: boolean;
}

// Data Quality
export type DqCategory = "puntuale" | "intra_entita" | "cross_entita";
export type DqRiskLevel = "ALTO" | "MEDIO" | "BASSO";
export type DqControlStatus = "da_implementare" | "in_sviluppo" | "attivo" | "non_attivo";

export interface DqDimension {
  id: string;
  name: string;
  sort_order: number;
}

export interface DqDimensionCreate {
  name: string;
  sort_order: number;
}

export interface DqDimensionUpdate {
  name?: string;
  sort_order?: number;
}

export interface DqCatalogControl {
  id: string;
  category: DqCategory;
  name: string;
  description: string;
  dimension_id: string;
  dimension: DqDimension;
  created_at: string;
  updated_at: string;
}

export interface DqCatalogControlCreate {
  category: DqCategory;
  name: string;
  description: string;
  dimension_id: string;
}

export interface DqCatalogControlUpdate {
  category?: DqCategory;
  name?: string;
  description?: string;
  dimension_id?: string;
}

export interface DqDomain {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DqDomainCreate {
  name: string;
  sort_order: number;
}

export interface DqDomainUpdate {
  name?: string;
  sort_order?: number;
}

export interface DqControlInstance {
  id: string;
  domain_id: string;
  catalog_control_id: string;
  catalog_control: DqCatalogControl;
  table_ref: string;
  field_ref: string;
  owner: string | null;
  risk: DqRiskLevel;
  impact: DqRiskLevel;
  status: DqControlStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DqControlInstanceCreate {
  domain_id: string;
  catalog_control_id: string;
  table_ref: string;
  field_ref: string;
  owner?: string | null;
  risk: DqRiskLevel;
  impact: DqRiskLevel;
  status: DqControlStatus;
  notes?: string | null;
}

export interface DqControlInstanceUpdate {
  table_ref?: string;
  field_ref?: string;
  owner?: string | null;
  risk?: DqRiskLevel;
  impact?: DqRiskLevel;
  status?: DqControlStatus;
  notes?: string | null;
}
