const FEATURE_ROUTES = [
  { route: "/", key: "overview" },
  { route: "/bdd", key: "bdd" },
  { route: "/settings/integrations", key: "settings_e2e" },
  { route: "/settings/bdd", key: "settings_gherkin" },
  { route: "/e2e", key: "e2e" },
  { route: "/sanp-health", key: "sanp_health" },
  { route: "/jira", key: "jira" },
  { route: "/metrics", key: "metrics" },
  { route: "/data-hub/psp-fees", key: "psp_fees" },
  { route: "/data-hub/gpd-positions", key: "gpd_positions" },
  { route: "/data-quality/catalog", key: "dq_catalog" },
  { route: "/data-quality/domains", key: "dq_domains" },
  { route: "/ea-map", key: "ea_map" },
  { route: "/docs", key: "docs" },
] as const;

export function featureKeyForPath(pathname: string): string | null {
  const normalizedPath = pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
  const match = FEATURE_ROUTES
    .filter(({ route }) => route === "/"
      ? normalizedPath === route
      : normalizedPath === route || normalizedPath.startsWith(`${route}/`))
    .sort((left, right) => right.route.length - left.route.length)[0];

  return match?.key ?? null;
}