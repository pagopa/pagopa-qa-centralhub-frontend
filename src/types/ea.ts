export type EaComponentKind = "be" | "fn" | "fe" | "lib" | "infra" | "test" | "mock" | "tool" | "doc";
export type EaEdgeType = "api" | "soap" | "event" | "data" | "ui";
/** Data Lake edges: producer → dataset, dataset → dataset, dataset → consumer. */
export type EaDataEdgeType = "produces" | "derives" | "feeds";
export type EaEdgeOrigin = "helm" | "infra_rule" | "curated" | "manual" | "contract" | "contract_rule";
export type EaDatasetLayer = "ingestion" | "silver" | "gold" | "export";

export interface EaQa {
  unit: number;
  it_repo: number;
  it_wf: boolean;
  perf_repo: boolean;
  e2e_repo: boolean;
  sonar: boolean;
  central: string[];
  nrt: string[];
  tas: boolean;
  tas_ci: boolean | null;
  tas_ci_override?: boolean | null;
  nodo_bdd: boolean;
  under_qa: boolean | null;
  qa_owner?: string | null;
  qa_notes?: string | null;
  score: number;
}

export interface EaDocLink {
  space: string | null;
  title: string;
  pages: number;
  url: string;
  source?: string;
}

interface EaNodeBase {
  id: string;
  name: string;
  desc: string;
  source?: string;
  verified?: boolean;
}

export interface EaArea extends EaNodeBase {
  type: "area";
  short?: string | null;
}

export interface EaProduct extends EaNodeBase {
  type: "product";
  parent: string;
  domain: string | null;
  conf: EaDocLink[];
}

export interface EaComponent extends EaNodeBase {
  type: "component";
  parent: string;
  kind: EaComponentKind;
  kindLabel: string;
  repo: string;
  private: boolean;
  lang: string[];
  fw: string[];
  ns: string | null;
  ingress: [string, string] | null;
  owners: string[];
  apis: { f: string; t: string | null }[];
  readme: string;
  workflows: { f: string; n: string | null; cron?: boolean }[];
  confRepo: string[];
  qa: EaQa;
}

export interface EaExternal extends EaNodeBase {
  type: "external" | "datastore";
}

/** A Data Lake dataset from the data contracts (docs/ea-map/DESIGN-data-lake.md). */
export interface EaDataset extends EaNodeBase {
  type: "dataset";
  layer: EaDatasetLayer;
  domain: string | null;
  contracted: boolean;
  table: string | null;
  topic: string | null;
  owner: string | null;
  version: string | null;
  url: string | null;
  /** Documentation link: the contact url of the contract, or the one corrected by hand. */
  docUrl?: string | null;
  docOverridden?: boolean;
  /** Slack channel: from the contract contact, or the one corrected by hand. */
  slackUrl?: string | null;
  slackOverridden?: boolean;
  fields: number;
  pii: number;
  checks: number;
  /** DQ Framework of the Hub: controls censused on this dataset's tables (total, active). */
  dq?: number;
  dqActive?: number;
}

export interface EaDqItem {
  id: string;
  table_ref: string;
  field_ref: string;
  check_name: string | null;
  status: string;
  dimension: string | null;
  control: string | null;
  domain: string | null;
  soda_url: string | null;
}

export interface EaDqCoverage {
  contract_checks: number;
  contract_dimensions: Record<string, number>;
  controls: number;
  active: number;
  statuses: Record<string, number>;
  dimensions: Record<string, number>;
  domains: string[];
  aligned: number;
  only_contract: string[];
  only_hub: string[];
  items: EaDqItem[];
}
export type EaNode = EaArea | EaProduct | EaComponent | EaExternal | EaDataset;

export interface EaEdge {
  id?: string;
  from: string;
  to: string;
  type: EaEdgeType | EaDataEdgeType;
  label?: string | null;
  origin?: EaEdgeOrigin;
  status?: string;
}

export interface EaBlueprint {
  segments: { id: string; name: string; who: string[]; actors: string[] }[];
  services: { id: string; name: string; seg: string[]; proc: string[] }[];
  functions: { id: string; name: string }[];
  processes: {
    id: string;
    name: string;
    fn: string;
    prod: string[];
    ref: { space: string; title: string; url: string } | null;
    suites: string[];
  }[];
  infra: { id: string; name: string; group: string; desc: string }[];
  prodInfra: Record<string, string[]>;
  risk: Record<string, string>;
  riskSrc: string | null;
  panels: {
    mission?: string;
    stakeholders?: string[];
    principles?: [string, string][];
    initiatives?: { name: string; url: string }[];
    references?: { name: string; url: string }[];
    qa_gate?: string[];
  };
}

export interface EaKb {
  meta: {
    generated?: string;
    updated_at?: string;
    sources?: { github_repos?: number; confluence_pages?: number; confluence_spaces?: string[] };
    tas?: { repo: string; workflow: string; nrt_workflow: string; nrt_cron: string };
  };
  nodes: EaNode[];
  edges: EaEdge[];
  blueprint: EaBlueprint;
}

/* ── Editing (PR2) ─────────────────────────────────────────────── */

export type EaEdgeStatus = "proposed" | "active" | "verified" | "rejected" | "removed";

/** Edge as returned by GET /ea/nodes/{id} (all statuses, with provenance). */
export interface EaEdgeDetail {
  id: string;
  from: string;
  to: string;
  type: string;
  label: string | null;
  origin: EaEdgeOrigin;
  status: EaEdgeStatus;
  confidence: number;
  note: string | null;
  evidence: Record<string, unknown> | null;
  created_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
}

export interface EaNodeDetail {
  id: string;
  kind: string;
  parent: string | null;
  name: string;
  desc: string | null;
  attrs: Record<string, unknown>;
  source: string;
  status: string;
  verified_at: string | null;
  verified_by: string | null;
  qa: EaQa | null;
  docs: EaDocLink[];
  out: EaEdgeDetail[];
  in: EaEdgeDetail[];
  dq?: EaDqCoverage | null;
}

export interface EaHistoryItem {
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  actor: string | null;
  at: string;
  detail: Record<string, unknown>;
}

export interface EaEdgeCreate {
  from_id: string;
  to_id: string;
  type: EaEdgeType | EaDataEdgeType;
  label?: string | null;
  note: string;
}

export interface EaEdgeUpdate {
  type?: EaEdgeType;
  label?: string | null;
  note?: string | null;
}

export interface EaNodeUpdate {
  name?: string;
  description?: string | null;
  parent_id?: string;
  ctype?: EaComponentKind;
  /** Datasets only: corrected layer, null = back to the one from the contract. */
  layer?: EaDatasetLayer | null;
  doc_url?: string | null;
  slack_url?: string | null;
}

export interface EaQaUpdate {
  under_qa?: boolean | null;
  tas_ci_override?: boolean | null;
  qa_owner?: string | null;
  qa_notes?: string | null;
}

/* ── Sync & review queue (PR3) ─────────────────────────────────── */

export type EaSyncRunStatus = "running" | "success" | "partial" | "failed";

export interface EaSyncRun {
  id: string;
  trigger: "beat" | "manual" | "import";
  triggered_by: string | null;
  started_at: string;
  finished_at: string | null;
  status: EaSyncRunStatus;
  stats: Record<string, number | null>;
  error: string | null;
}

export interface EaSyncStatus {
  running: EaSyncRun | null;
  last: EaSyncRun | null;
  last_success_at: string | null;
  last_error: string | null;
  open_changes: number;
}

export type EaChangeStatus = "pending" | "conflict" | "approved" | "rejected" | "auto_applied" | "superseded";

export interface EaChange {
  id: string;
  run_id: string | null;
  entity: "node" | "edge" | "qa" | "doc";
  op: "add" | "update" | "remove";
  target_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  structural: boolean;
  status: EaChangeStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface EaChangeDecision {
  note?: string | null;
  parent_id?: string;
  ctype?: EaComponentKind;
  name?: string;
}

/* ── Release impact and map assistant ─────────────────────────── */

export type EaRisk = "alto" | "medio" | "basso" | "nessuno";

export interface EaImpactedNode {
  id: string;
  name: string;
  type: string;
  product: string | null;
  relation: "chiamante" | "dipendenza" | "dato a valle";
  /** every way the node is reached (it can both call the changed component and be called by it) */
  relations?: string[];
  depth: number;
  via: string;
  path: string[];
  risk: EaRisk;
  reason: string;
  qa_score: number | null;
}

export interface EaSuggestedSuite {
  name: string;
  kind: string;
  covers: string[];
  /** 0 = covers the changed component, 1 = high/medium impact, 2 = low impact */
  priority: number;
}

export interface EaReleaseImpact {
  change: {
    repo: string;
    title: string;
    url: string;
    ref: string;
    state: string | null;
    files: number;
    additions: number;
    deletions: number;
  };
  component: { id: string; name: string; product: string | null; qa_score: number };
  risk: EaRisk;
  categories: { key: string; label: string; weight: number; files: number; examples: string[] }[];
  impacted: EaImpactedNode[];
  suites: EaSuggestedSuite[];
  gaps: { id: string; name: string; qa_score: number; reason: string }[];
  processes: {
    id: string;
    name: string;
    services: string[];
    ref: { space?: string; title?: string; url?: string } | null;
    via: string[];
  }[];
  highlight: string[];
}

export interface EaReleaseImpactRequest {
  url?: string;
  repo?: string;
  base?: string;
  head?: string;
}

export interface EaChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EaAssistantReply {
  answer: string;
  highlight: string[];
  labels: Record<string, string>;
  steps: { tool: string; label: string }[];
}
