export type EaComponentKind = "be" | "fn" | "fe" | "lib" | "infra" | "test" | "mock" | "tool" | "doc";
export type EaEdgeType = "api" | "soap" | "event" | "data" | "ui";
export type EaEdgeOrigin = "helm" | "infra_rule" | "curated" | "manual";

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

export type EaNode = EaArea | EaProduct | EaComponent | EaExternal;

export interface EaEdge {
  id?: string;
  from: string;
  to: string;
  type: EaEdgeType;
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
  type: EaEdgeType;
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
