import { describe, expect, it } from "vitest";
import type { EaInfraResource, EaInfraView } from "@/types/ea";
import { decodeRoute, encodeRoute } from "./graph";
import {
  EXTERNAL_STACK,
  NO_INFRA_FILTERS,
  buildIndex,
  layoutStack,
  monitoringRows,
  monitoringSummary,
  domainOf,
  layerOf,
  layeredView,
  monitoringRowsOfDomain,
  resolveSelection,
  stacksByRepo,
  visibleLinks,
} from "./infra";
import { INFRA_GENERIC, infraType } from "./infraIcons";

const CORE = "pagopa-infra-core:src/core";
const APP = "pagopa-infra:src/domains/gps-app";

const res = (id: string, ltype: string, extra: Partial<EaInfraResource> = {}): EaInfraResource => {
  const [repo, stack] = id.split(":");
  return {
    id,
    label: id.split(":").pop()!.split(".").pop()!,
    ltype,
    vendor: "azure",
    tf_type: `azurerm_${ltype}`,
    address: id.split(":").pop()!,
    repo,
    stack,
    file_url: null,
    parent: null,
    blueprint: null,
    node: null,
    external: false,
    envs: ["prod", "uat", "dev"],
    location: "westeurope",
    attrs: {},
    ...extra,
  };
};

function view(): EaInfraView {
  const resources = [
    res(`${CORE}:azurerm_resource_group.rg`, "resource_group"),
    res(`${CORE}:azurerm_application_insights.appi`, "monitoring", { parent: `${CORE}:azurerm_resource_group.rg` }),
    res(`${CORE}:module.aks`, "kubernetes", { parent: `${CORE}:azurerm_resource_group.rg`, tf_type: "kubernetes_cluster" }),
    res(`${CORE}:azurerm_monitor_action_group.slack`, "action_group"),
    res(`${APP}:kubernetes_namespace.ns`, "kubernetes", { parent: `${CORE}:module.aks`, tf_type: "kubernetes_namespace" }),
    res(`${APP}:helm_release.reloader`, "kubernetes", { parent: `${APP}:kubernetes_namespace.ns`, tf_type: "helm_release" }),
    res(`${APP}:module.api`, "api_gateway", { node: "pagopa-gpd-payments", tf_type: "api_management_api" }),
    res(`${CORE}:module.apim`, "api_gateway", { tf_type: "api_management" }),
    res(`${APP}:module.cosmos`, "db_nosql", { tf_type: "cosmosdb_account" }),
    res(`${APP}:azurerm_monitor_scheduled_query_rules_alert.avail`, "monitoring", { envs: ["prod"] }),
    res("external:azurerm_container_registry:acr", "container", { external: true, tf_type: "azurerm_container_registry" }),
  ];
  return {
    env: "prod",
    envs: ["prod", "uat", "dev"],
    synced_at: null,
    resources,
    links: [
      { from: `${APP}:module.api`, to: `${CORE}:module.aks`, kind: "ref", origin: "inferred", evidence: {} },
      { from: `${APP}:module.api`, to: `${CORE}:module.apim`, kind: "ref", origin: "inferred", evidence: {} },
      { from: `${APP}:helm_release.reloader`, to: `${APP}:kubernetes_namespace.ns`, kind: "ref", origin: "explicit", evidence: {} },
      {
        from: `${APP}:azurerm_monitor_scheduled_query_rules_alert.avail`,
        to: `${CORE}:azurerm_application_insights.appi`,
        kind: "monitors",
        origin: "inferred",
        evidence: {},
      },
    ],
    monitoring: {
      alerts: [
        {
          id: `${APP}:azurerm_monitor_scheduled_query_rules_alert.avail`,
          label: "avail",
          severity: 1,
          kind: "log",
          targets: [`${CORE}:azurerm_application_insights.appi`],
          action_groups: [`${CORE}:azurerm_monitor_action_group.slack`],
        },
      ],
      action_groups: [{ id: `${CORE}:azurerm_monitor_action_group.slack`, label: "SlackPagoPA", channels: ["slack"] }],
      dashboards: [],
    },
  };
}

describe("infrastructure view", () => {
  it("groups resources by stack, core first and externals last", () => {
    const idx = buildIndex(view());
    const groups = stacksByRepo(idx);
    expect(groups.map((g) => g.repo)).toEqual(["pagopa-infra-core", "pagopa-infra", EXTERNAL_STACK]);
    const app = idx.stacks.get(APP)!;
    expect(app.name).toBe("gps-app");
    expect(app.alerts).toBe(1);
    expect(app.counts).toEqual({ kubernetes: 2, api_gateway: 1, db_nosql: 1 });
  });

  it("nests containers, keeps alerts and action groups off the canvas", () => {
    const idx = buildIndex(view());
    const core = layoutStack(idx, idx.stacks.get(CORE)!, NO_INFRA_FILTERS);
    expect(core.containers.map((b) => b.res.label)).toEqual(["rg"]);
    expect(core.containers[0].children.map((b) => b.res.label)).toEqual(["aks", "appi"]);
    expect(core.shown.has(`${CORE}:azurerm_monitor_action_group.slack`)).toBe(false);

    const app = layoutStack(idx, idx.stacks.get(APP)!, NO_INFRA_FILTERS);
    // the namespace lives in the core cluster: shown as outer container, not as a box here
    expect(app.outerParents.get(`${APP}:kubernetes_namespace.ns`)?.label).toBe("aks");
    expect(app.containers[0].children.map((b) => b.res.label)).toEqual(["reloader"]);
    expect(app.shown.has(`${APP}:azurerm_monitor_scheduled_query_rules_alert.avail`)).toBe(false);
    expect(app.neighbours.map((n) => n.label)).toEqual(["aks", "apim"]);
    expect(visibleLinks(idx, app).map((l) => l.origin).sort()).toEqual(["explicit", "inferred", "inferred"]);
  });

  it("filters keep the containers of a match", () => {
    const idx = buildIndex(view());
    const lay = layoutStack(idx, idx.stacks.get(APP)!, { ltypes: new Set(), q: "reloader" });
    expect([...lay.shown].sort()).toEqual([`${APP}:helm_release.reloader`, `${APP}:kubernetes_namespace.ns`]);
    const byType = layoutStack(idx, idx.stacks.get(APP)!, { ltypes: new Set(["api_gateway"]), q: "" });
    expect(byType.lanes.map((l) => l.ltype)).toEqual(["api_gateway"]);
  });

  it("builds the monitoring chain of a stack, also for alerts defined elsewhere", () => {
    const v = view();
    const idx = buildIndex(v);
    const core = monitoringRows(v, idx, idx.stacks.get(CORE)!);
    expect(core).toHaveLength(1); // the alert lives in gps-app but watches core's app insights
    expect(core[0].groups[0].channels).toEqual(["slack"]);
    expect(monitoringSummary(core)).toEqual({ alerts: 1, bySeverity: { "1": 1 }, withoutGroup: 0, channels: { slack: 1 } });
    expect(monitoringRows(v, idx, null)).toHaveLength(1);
  });

  it("resolves a route to layers, a domain, a stack or a resource and round-trips the hash", () => {
    const idx = buildIndex(view());
    expect(resolveSelection(idx, null)).toEqual({ mode: "layers", domain: null, stack: null, resource: null });
    expect(resolveSelection(idx, "dom:gps")).toMatchObject({ mode: "layers", domain: "gps" });
    expect(resolveSelection(idx, "stk:")).toMatchObject({ mode: "stacks", stack: null });
    expect(resolveSelection(idx, `stk:${CORE}`).stack?.key).toBe(CORE);
    // an architectural component opens its domain in the layers
    expect(resolveSelection(idx, `${APP}:module.api`)).toMatchObject({ mode: "layers", domain: "gps" });
    // a helm release is a Terraform detail: its stack
    expect(resolveSelection(idx, `${APP}:helm_release.reloader`)).toMatchObject({ mode: "stacks" });
    const r = { view: "infra" as const, nodeId: `${APP}:module.api` };
    expect(decodeRoute(`#${encodeRoute(r)}`)).toEqual(r);
    expect(decodeRoute("#infra")).toEqual({ view: "infra", nodeId: null });
  });

  it("places architectural components on layers and domains", () => {
    const idx = buildIndex(view());
    const api = idx.byId.get(`${APP}:module.api`)!;
    expect(layerOf(api)).toBe("api");
    expect(layerOf(idx.byId.get(`${CORE}:module.apim`)!)).toBe("edge");
    expect(layerOf(idx.byId.get(`${APP}:helm_release.reloader`)!)).toBeNull();
    const web = res(`${APP}:module.hub`, "app_service", { tf_type: "IDH/app_service_webapp" });
    expect(layerOf(web)).toBe("compute");
    expect(layerOf({ ...web, attrs: { web_frontend: true, image: "pagopa-qa-centralhub-fe" } })).toBe("frontend");
    expect(domainOf(api)).toBe("gps");
    expect(domainOf(idx.byId.get(`${CORE}:module.aks`)!)).toBe("piattaforma");

    const all = layeredView(idx, null, NO_INFRA_FILTERS);
    expect(all.domains.map((d) => d.key)).toEqual(["piattaforma", "gps", "esterne"]);
    const gps = layeredView(idx, "gps", NO_INFRA_FILTERS);
    const byLayer = Object.fromEntries(gps.layers.map((l) => [l.key, l.groups.map((g) => g.domain)]));
    expect(byLayer.api).toEqual(["gps"]);
    // the APIM instance and the AKS cluster of the core are shared resources of the gps slice
    expect(byLayer.edge).toEqual(["shared:piattaforma"]);
    expect(byLayer.compute).toEqual(["gps", "shared:piattaforma"]);
    expect(gps.shared.has(`${CORE}:module.apim`)).toBe(true);
    expect(byLayer.data).toEqual(["gps"]);
  });

  it("filters the monitoring chain by domain", () => {
    const v = view();
    const idx = buildIndex(v);
    expect(monitoringRowsOfDomain(v, idx, "gps")).toHaveLength(1);
    expect(monitoringRowsOfDomain(v, idx, "piattaforma")).toHaveLength(1); // watches core app insights
    expect(monitoringRowsOfDomain(v, idx, "nodo")).toHaveLength(0);
  });

  it("falls back to a generic icon for unmapped types", () => {
    expect(infraType("api_gateway").label).toBe("API Gateway");
    expect(infraType("quantum_thing")).toBe(INFRA_GENERIC);
  });
});
