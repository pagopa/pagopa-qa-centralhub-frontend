/**
 * Infrastructure view: pure helpers (grouping, nesting, filters) over the /ea/infra payload.
 * Kept free of React so they can be tested on their own.
 */
import type { EaInfraAlert, EaInfraLink, EaInfraResource, EaInfraView } from "@/types/ea";

export const EXTERNAL_STACK = "external";
/** Shown in the Monitoring & Alerting band, not on the canvas. */
const BAND_LTYPES = new Set(["action_group"]);
const CONTAINER_LTYPES = new Set(["resource_group", "network", "kubernetes"]);

export interface InfraStack {
  key: string;
  repo: string;
  stack: string;
  /** last folder of the stack ("gps-app", "aks-platform") */
  name: string;
  resources: EaInfraResource[];
  counts: Record<string, number>;
  alerts: number;
}

export interface InfraIndex {
  byId: Map<string, EaInfraResource>;
  stacks: Map<string, InfraStack>;
  alerts: Map<string, EaInfraAlert>;
  out: Map<string, EaInfraLink[]>;
  in: Map<string, EaInfraLink[]>;
}

export function stackKeyOf(r: EaInfraResource): string {
  return r.external ? EXTERNAL_STACK : `${r.repo}:${r.stack}`;
}

export function isAlert(r: EaInfraResource, idx: InfraIndex): boolean {
  return idx.alerts.has(r.id);
}

export function buildIndex(view: EaInfraView): InfraIndex {
  const byId = new Map(view.resources.map((r) => [r.id, r]));
  const alerts = new Map(view.monitoring.alerts.map((a) => [a.id, a]));
  const stacks = new Map<string, InfraStack>();
  for (const r of view.resources) {
    const key = stackKeyOf(r);
    let st = stacks.get(key);
    if (!st) {
      st = {
        key,
        repo: r.external ? "" : r.repo,
        stack: r.external ? "" : r.stack,
        name: r.external ? "Fuori dai repository letti" : r.stack.split("/").pop() || r.stack,
        resources: [],
        counts: {},
        alerts: 0,
      };
      stacks.set(key, st);
    }
    st.resources.push(r);
    if (alerts.has(r.id)) st.alerts += 1;
    else st.counts[r.ltype] = (st.counts[r.ltype] ?? 0) + 1;
  }
  const out = new Map<string, EaInfraLink[]>();
  const inn = new Map<string, EaInfraLink[]>();
  for (const l of view.links) {
    if (!out.has(l.from)) out.set(l.from, []);
    out.get(l.from)!.push(l);
    if (!inn.has(l.to)) inn.set(l.to, []);
    inn.get(l.to)!.push(l);
  }
  return { byId, stacks, alerts, out, in: inn };
}

/** Stacks grouped by repository, the biggest first; external resources last. */
export function stacksByRepo(idx: InfraIndex): { repo: string; stacks: InfraStack[] }[] {
  const groups = new Map<string, InfraStack[]>();
  for (const st of idx.stacks.values()) {
    const repo = st.key === EXTERNAL_STACK ? EXTERNAL_STACK : st.repo;
    if (!groups.has(repo)) groups.set(repo, []);
    groups.get(repo)!.push(st);
  }
  const order = (r: string) => (r === EXTERNAL_STACK ? 2 : r.endsWith("-core") ? 0 : 1);
  return [...groups.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([repo, sts]) => ({ repo, stacks: sts.sort((a, b) => a.name.localeCompare(b.name)) }));
}

export interface InfraFilters {
  ltypes: Set<string>;
  q: string;
}

export const NO_INFRA_FILTERS: InfraFilters = { ltypes: new Set(), q: "" };

export function matches(r: EaInfraResource, f: InfraFilters): boolean {
  if (f.ltypes.size && !f.ltypes.has(r.ltype)) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  return r.label.toLowerCase().includes(q) || r.address.toLowerCase().includes(q) || r.tf_type.includes(q);
}

export function hasFilters(f: InfraFilters): boolean {
  return f.ltypes.size > 0 || f.q.trim() !== "";
}

/** Resources of a stack matching the filters, by logical type (alerts excluded). */
export function stackMatches(idx: InfraIndex, st: InfraStack, f: InfraFilters): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of st.resources) {
    if (idx.alerts.has(r.id) || !matches(r, f)) continue;
    out[r.ltype] = (out[r.ltype] ?? 0) + 1;
  }
  return out;
}

export interface InfraBox {
  res: EaInfraResource;
  /** nested resources (containers) */
  children: InfraBox[];
}

export interface StackLayout {
  /** containers with what they hold */
  containers: InfraBox[];
  /** resources without a container in this stack, by logical type */
  lanes: { ltype: string; items: EaInfraResource[] }[];
  /** containers of another stack holding resources of this one (e.g. the core resource group) */
  outerParents: Map<string, EaInfraResource>;
  /** resources of other stacks linked to this one */
  neighbours: EaInfraResource[];
  shown: Set<string>;
}

/**
 * Nested layout of one stack: containers hold their children (recursively), the rest go to
 * lanes by type. Alerts and action groups stay in the monitoring band. A resource matching
 * the filters keeps its containers visible.
 */
export function layoutStack(idx: InfraIndex, st: InfraStack, f: InfraFilters): StackLayout {
  const own = st.resources.filter((r) => !isAlert(r, idx) && !BAND_LTYPES.has(r.ltype));
  const ownIds = new Set(own.map((r) => r.id));
  const kids = new Map<string, EaInfraResource[]>();
  const outerParents = new Map<string, EaInfraResource>();
  for (const r of own) {
    if (r.parent && ownIds.has(r.parent) && r.parent !== r.id) {
      if (!kids.has(r.parent)) kids.set(r.parent, []);
      kids.get(r.parent)!.push(r);
    } else if (r.parent && idx.byId.has(r.parent)) {
      outerParents.set(r.id, idx.byId.get(r.parent)!);
    }
  }
  const keep = new Set<string>();
  for (const r of own) {
    if (!matches(r, f)) continue;
    // a match keeps the chain of its containers
    let cur: EaInfraResource | undefined = r;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      keep.add(cur.id);
      cur = cur.parent && ownIds.has(cur.parent) ? idx.byId.get(cur.parent) : undefined;
    }
  }
  const byLabel = (a: EaInfraResource, b: EaInfraResource) => a.label.localeCompare(b.label);
  const box = (r: EaInfraResource, seen: Set<string>): InfraBox => {
    const next = new Set(seen).add(r.id);
    const children = (kids.get(r.id) ?? [])
      .filter((c) => keep.has(c.id) && !next.has(c.id))
      .sort(byLabel)
      .map((c) => box(c, next));
    return { res: r, children };
  };
  const roots = own.filter((r) => keep.has(r.id) && !(r.parent && ownIds.has(r.parent) && r.parent !== r.id));
  const containers = roots
    .filter((r) => CONTAINER_LTYPES.has(r.ltype) && (kids.get(r.id)?.length ?? 0) > 0)
    .sort(byLabel)
    .map((r) => box(r, new Set()));
  const inBox = new Set(containers.map((b) => b.res.id));
  const laneMap = new Map<string, EaInfraResource[]>();
  for (const r of roots) {
    if (inBox.has(r.id)) continue;
    if (!laneMap.has(r.ltype)) laneMap.set(r.ltype, []);
    laneMap.get(r.ltype)!.push(r);
  }
  const lanes = [...laneMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ltype, items]) => ({ ltype, items: items.sort(byLabel) }));

  const shown = new Set(keep);
  const neighbours = new Map<string, EaInfraResource>();
  for (const id of keep) {
    for (const l of [...(idx.out.get(id) ?? []), ...(idx.in.get(id) ?? [])]) {
      const other = l.from === id ? l.to : l.from;
      const o = idx.byId.get(other);
      if (o && !ownIds.has(other) && !isAlert(o, idx) && !BAND_LTYPES.has(o.ltype)) neighbours.set(other, o);
    }
  }
  return {
    containers,
    lanes,
    outerParents,
    neighbours: [...neighbours.values()].sort(byLabel),
    shown,
  };
}

/** Arrows to draw between what is on screen (both ends shown). */
export function visibleLinks(idx: InfraIndex, lay: StackLayout): EaInfraLink[] {
  const on = new Set([...lay.shown, ...lay.neighbours.map((n) => n.id)]);
  const out: EaInfraLink[] = [];
  for (const id of lay.shown) {
    for (const l of idx.out.get(id) ?? []) if (l.kind === "ref" && on.has(l.to)) out.push(l);
    for (const l of idx.in.get(id) ?? []) if (l.kind === "ref" && on.has(l.from) && !lay.shown.has(l.from)) out.push(l);
  }
  return out;
}

export interface MonitoringRow {
  alert: EaInfraAlert;
  targets: EaInfraResource[];
  groups: { id: string; label: string; channels: string[] }[];
}

/** Monitoring chain (resource → rule → action group → channel) of the alerts that live in a
 * stack or watch one of its resources; ``null`` stack: the whole environment. */
export function monitoringRows(view: EaInfraView, idx: InfraIndex, st: InfraStack | null): MonitoringRow[] {
  const groups = new Map(view.monitoring.action_groups.map((g) => [g.id, g]));
  const inStack = (id: string) => {
    const r = idx.byId.get(id);
    return !!r && !!st && stackKeyOf(r) === st.key;
  };
  return view.monitoring.alerts
    .filter((a) => !st || inStack(a.id) || a.targets.some(inStack))
    .map((a) => ({
      alert: a,
      targets: a.targets.map((t) => idx.byId.get(t)).filter((r): r is EaInfraResource => !!r),
      groups: a.action_groups.map(
        (g) => groups.get(g) ?? { id: g, label: idx.byId.get(g)?.label ?? g, channels: [] },
      ),
    }))
    .sort((a, b) => Number(a.alert.severity ?? 9) - Number(b.alert.severity ?? 9) || a.alert.label.localeCompare(b.alert.label));
}

export interface MonitoringSummary {
  alerts: number;
  bySeverity: Record<string, number>;
  withoutGroup: number;
  channels: Record<string, number>;
}

export function monitoringSummary(rows: MonitoringRow[]): MonitoringSummary {
  const bySeverity: Record<string, number> = {};
  const channels: Record<string, number> = {};
  let withoutGroup = 0;
  for (const r of rows) {
    const sev = r.alert.severity == null ? "?" : String(r.alert.severity);
    bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
    if (!r.groups.length) withoutGroup += 1;
    const seen = new Set(r.groups.flatMap((g) => g.channels));
    for (const c of seen) channels[c] = (channels[c] ?? 0) + 1;
  }
  return { alerts: rows.length, bySeverity, withoutGroup, channels };
}

/**
 * Route of the infra view: nothing (layers, all domains), ``dom:<domain>`` (layers of one
 * domain), ``stk:<stack key>`` (one Terraform stack) or a resource id (its domain, card open).
 */
export interface InfraSelection {
  mode: "layers" | "stacks";
  domain: string | null;
  stack: InfraStack | null;
  resource: EaInfraResource | null;
}

export function resolveSelection(idx: InfraIndex, nodeId: string | null): InfraSelection {
  if (!nodeId) return { mode: "layers", domain: null, stack: null, resource: null };
  if (nodeId === "stk:") return { mode: "stacks", domain: null, stack: null, resource: null };
  if (nodeId.startsWith("dom:")) return { mode: "layers", domain: nodeId.slice(4), stack: null, resource: null };
  if (nodeId.startsWith("stk:")) {
    return { mode: "stacks", domain: null, stack: idx.stacks.get(nodeId.slice(4)) ?? null, resource: null };
  }
  const res = idx.byId.get(nodeId) ?? null;
  if (res && layerOf(res) === null) {
    // not an architectural component: show it in its Terraform stack
    return { mode: "stacks", domain: null, stack: idx.stacks.get(stackKeyOf(res)) ?? null, resource: res };
  }
  return { mode: "layers", domain: res ? domainOf(res) : null, stack: null, resource: res };
}

/* ── Top-down view: layers × domains ───────────────────────────── */

export type InfraLayerKey = "frontend" | "edge" | "api" | "compute" | "messaging" | "data" | "cross";

/**
 * Layers of the platform, top to bottom, and the Terraform types shown in each one. Only the
 * architectural components: sub-resources (storage queues, Cosmos collections, APIM policies,
 * subnets...) stay in the per-stack view.
 */
export const INFRA_LAYERS: { key: InfraLayerKey; title: string; hint: string; tfTypes: string[] }[] = [
  {
    key: "frontend",
    title: "Frontend web",
    hint: "Le applicazioni che si aprono nel browser: Front Door e CDN che servono i file statici, Static Web App e App Service con un frontend web (Next.js, React).",
    tfTypes: ["cdn_frontdoor", "cdn", "azurerm_cdn_frontdoor_profile", "azurerm_cdn_profile", "azurerm_static_web_app"],
  },
  {
    key: "edge",
    title: "Ingresso",
    hint: "Dove entrano le chiamate: DNS pubblici, Application Gateway, API Management.",
    tfTypes: ["azurerm_dns_zone", "azurerm_application_gateway", "app_gw", "api_management", "azurerm_api_management"],
  },
  {
    key: "api",
    title: "API",
    hint: "Le API pubblicate su API Management, per dominio.",
    tfTypes: ["api_management_api", "azurerm_api_management_api"],
  },
  {
    key: "compute",
    title: "Calcolo",
    hint: "Dove girano i servizi: cluster AKS e namespace dei domini, App Service, Function, Container App, Lambda.",
    tfTypes: [
      "kubernetes_cluster", "azurerm_kubernetes_cluster", "kubernetes_namespace", "app_service",
      "IDH/app_service_webapp", "azurerm_linux_web_app", "function_app",
      "IDH/function_app", "azurerm_function_app", "azurerm_linux_function_app", "azurerm_container_app_environment",
      "container_app_environment_v2", "aws_lambda_function",
    ],
  },
  {
    key: "messaging",
    title: "Messaggi ed eventi",
    hint: "Event Hub, Service Bus, Event Grid, notifiche e email (AWS SES/SNS).",
    tfTypes: [
      "eventhub", "azurerm_eventhub_namespace", "azurerm_eventhub", "azurerm_servicebus_namespace",
      "azurerm_servicebus_queue", "azurerm_eventgrid_system_topic", "aws_sns_topic", "terraform-aws-ses", "ses",
    ],
  },
  {
    key: "data",
    title: "Dati",
    hint: "Database, cache, storage, Data Explorer e pipeline dati.",
    tfTypes: [
      "cosmosdb_account", "azurerm_cosmosdb_account", "postgres_flexible_server", "IDH/postgres_flexible_server",
      "postgres_flexible_server_replica", "azurerm_postgresql_flexible_server", "redis_cache", "IDH/redis",
      "storage_account", "IDH/storage_account", "azurerm_storage_account", "aws_s3_bucket", "aws_dynamodb_table",
      "azurerm_kusto_cluster", "azurerm_data_factory",
    ],
  },
  {
    key: "cross",
    title: "Trasversali",
    hint: "Segreti, rete, identità, registry e osservabilità usati da tutti i livelli.",
    tfTypes: [
      "key_vault", "IDH/key_vault", "azurerm_key_vault", "virtual_network", "azurerm_virtual_network", "nat_gateway",
      "azurerm_nat_gateway", "azurerm_container_registry", "azurerm_user_assigned_identity",
      "azurerm_application_insights", "azurerm_log_analytics_workspace", "azurerm_dashboard_grafana",
    ],
  },
];

const LAYER_OF = new Map(INFRA_LAYERS.flatMap((l) => l.tfTypes.map((t) => [t, l.key] as const)));

export function layerOf(r: EaInfraResource): InfraLayerKey | null {
  const layer = LAYER_OF.get(r.tf_type) ?? null;
  // an App Service running a web frontend (Next.js, React, Vite app settings) is a frontend
  if (layer === "compute" && r.attrs.web_frontend === true) return "frontend";
  return layer;
}

export const CORE_DOMAIN = "piattaforma";
export const EXTERNAL_DOMAIN = "esterne";

/** Business domain of a resource, from its stack ("src/domains/gps-app" → "gps"). */
export function domainOf(r: EaInfraResource): string {
  if (r.external) return EXTERNAL_DOMAIN;
  const m = r.stack.match(/(?:domains|domanins)\/([^/]+)/);
  if (m) return m[1].replace(/-(app|common|secrets?|cron|legacy)$/, "");
  if (r.stack.includes("portal-pagopa")) return "portal";
  return CORE_DOMAIN;
}

export function domainLabel(d: string): string {
  if (d === CORE_DOMAIN) return "Piattaforma (core)";
  if (d === EXTERNAL_DOMAIN) return "Fuori dai repo letti";
  return d;
}

export interface LayerGroup {
  domain: string;
  items: EaInfraResource[];
}

export interface LayeredView {
  layers: {
    key: InfraLayerKey;
    title: string;
    hint: string;
    /** per domain; with a domain selected: that domain, then the shared resources it uses */
    groups: LayerGroup[];
    total: number;
  }[];
  domains: { key: string; n: number }[];
  /** resources of other domains used by the selected one */
  shared: Set<string>;
  shown: Set<string>;
}

/** Resources directly connected to ``id``: links in both directions, container and contents. */
export function connected(idx: InfraIndex, id: string): Set<string> {
  const out = new Set<string>();
  for (const l of idx.out.get(id) ?? []) out.add(l.to);
  for (const l of idx.in.get(id) ?? []) out.add(l.from);
  const r = idx.byId.get(id);
  if (r?.parent) out.add(r.parent);
  for (const o of idx.byId.values()) if (o.parent === id) out.add(o.id);
  out.delete(id);
  return out;
}

export function layeredView(idx: InfraIndex, domain: string | null, f: InfraFilters): LayeredView {
  const all = [...idx.byId.values()].filter((r) => layerOf(r) !== null);
  const counts = new Map<string, number>();
  for (const r of all) counts.set(domainOf(r), (counts.get(domainOf(r)) ?? 0) + 1);
  const order = (d: string) => (d === CORE_DOMAIN ? 0 : d === EXTERNAL_DOMAIN ? 2 : 1);
  const domains = [...counts.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([key, n]) => ({ key, n }));

  const mine = all.filter((r) => (!domain || domainOf(r) === domain) && matches(r, f));
  const shared = new Set<string>();
  if (domain) {
    const ids = new Set(mine.map((r) => r.id));
    for (const r of mine) {
      for (const other of connected(idx, r.id)) {
        const o = idx.byId.get(other);
        if (o && !ids.has(other) && layerOf(o) !== null) shared.add(other);
      }
    }
  }
  if (domain) {
    // APIs always live in an API Management and namespaces in an AKS cluster, even when the
    // Terraform reaches them through provider settings or locals instead of a reference
    const has = (types: string[]) => mine.some((r) => types.includes(r.tf_type));
    const implied: [string[], string[]][] = [
      [["api_management_api", "azurerm_api_management_api"], ["api_management", "azurerm_api_management"]],
      [["kubernetes_namespace"], ["kubernetes_cluster", "azurerm_kubernetes_cluster"]],
    ];
    for (const [when, add] of implied) {
      if (!has(when)) continue;
      for (const r of idx.byId.values()) if (add.includes(r.tf_type) && domainOf(r) !== domain) shared.add(r.id);
    }
  }
  const visible = [...mine, ...[...shared].map((id) => idx.byId.get(id)!)];
  const byLabel = (a: EaInfraResource, b: EaInfraResource) => a.label.localeCompare(b.label);
  const layers = INFRA_LAYERS.map((l) => {
    const items = visible.filter((r) => layerOf(r) === l.key);
    const groups = new Map<string, EaInfraResource[]>();
    for (const r of items) {
      const key = shared.has(r.id) ? `shared:${domainOf(r)}` : domainOf(r);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const gOrder = (k: string) => (k.startsWith("shared:") ? 3 : order(k));
    return {
      key: l.key,
      title: l.title,
      hint: l.hint,
      total: items.length,
      groups: [...groups.entries()]
        .sort(([a], [b]) => gOrder(a) - gOrder(b) || a.localeCompare(b))
        .map(([d, rs]) => ({ domain: d, items: rs.sort(byLabel) })),
    };
  });
  return { layers, domains, shared, shown: new Set(visible.map((r) => r.id)) };
}

/** Monitoring rows of the alerts of a domain, or watching one of its resources. */
export function monitoringRowsOfDomain(view: EaInfraView, idx: InfraIndex, domain: string | null): MonitoringRow[] {
  const rows = monitoringRows(view, idx, null);
  if (!domain) return rows;
  const inDomain = (id: string) => {
    const r = idx.byId.get(id);
    return !!r && domainOf(r) === domain;
  };
  return rows.filter((r) => inDomain(r.alert.id) || r.alert.targets.some(inDomain));
}

/** Why a resource read by the Terraform is not among the ones the repositories create. */
export function externalReason(r: { external: boolean; attrs: Record<string, unknown> }): string | null {
  if (!r.external) return null;
  if (r.attrs.reason === "unresolved_name")
    return "Il Terraform la legge ma il suo nome non si può calcolare (dipende da output di altri stack o da funzioni non supportate): non sappiamo a quale risorsa corrisponda.";
  return "Il Terraform la legge (blocco data) ma nessuno stack di pagopa-infra, pagopa-infra-core e pagopa-aws-infra crea una risorsa con questo nome in questo ambiente: è gestita altrove.";
}
