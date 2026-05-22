export type Role = "qa_engineer" | "qa_lead" | "product_owner" | "stakeholder";
export type Action =
  | "view:overview"
  | "view:e2e"
  | "view:coverage"
  | "view:perf"
  | "view:jira"
  | "view:bugs"
  | "view:releases"
  | "view:docs"
  | "view:dashboards"
  | "view:settings"
  | "manage:integrations"
  | "manage:team"
  | "manage:notifications"
  | "manage:dashboards"
  | "ingest:runs";

const CAN: Record<Role, Set<Action>> = {
  qa_engineer: new Set([
    "view:overview", "view:e2e", "view:coverage", "view:perf",
    "view:jira", "view:bugs", "view:releases", "view:docs",
    "view:dashboards", "ingest:runs",
  ]),
  qa_lead: new Set([
    "view:overview", "view:e2e", "view:coverage", "view:perf",
    "view:jira", "view:bugs", "view:releases", "view:docs",
    "view:dashboards", "ingest:runs",
    "view:settings", "manage:integrations", "manage:team",
    "manage:notifications", "manage:dashboards",
  ]),
  product_owner: new Set(["view:overview", "view:dashboards", "view:releases"]),
  stakeholder: new Set(["view:overview", "view:dashboards"]),
};

export function can(role: Role, action: Action): boolean {
  return CAN[role]?.has(action) ?? false;
}

export function Gate({
  role,
  action,
  children,
  fallback = null,
}: {
  role: Role;
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return can(role, action) ? <>{children}</> : <>{fallback}</>;
}
