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
