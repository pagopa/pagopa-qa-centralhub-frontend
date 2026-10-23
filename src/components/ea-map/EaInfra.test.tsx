import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildGraph } from "@/lib/ea-map/graph";
import type { EaInfraResourceDetail, EaInfraView, EaKb } from "@/types/ea";
import { EaInfra } from "./EaInfra";

const mocks = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient, ApiError: Error }));

const KB = {
  meta: {},
  nodes: [
    {
      id: "pagopa-gpd-payments", type: "component", parent: "prod:gpd", name: "GPD Payments", desc: "", kind: "be",
      repo: "", private: false, lang: [], fw: [], ns: null, ingress: null, owners: [], apis: [], readme: "",
      workflows: [], confRepo: [], qa: { unit: 0, it_repo: 0, central: [], nrt: [] },
    },
  ],
  edges: [],
  blueprint: { segments: [], services: [], functions: [], processes: [], infra: [], prodInfra: {}, risk: {}, riskSrc: null, panels: {} },
} as unknown as EaKb;

const CORE = "pagopa-infra-core:src/core";
const APP = "pagopa-infra:src/domains/gps-app";
const base = { vendor: "azure", file_url: null, blueprint: null, node: null, external: false, envs: ["prod"], location: null, attrs: {} };

const VIEW: EaInfraView = {
  env: "prod",
  envs: ["prod", "uat", "dev"],
  synced_at: "2026-10-22T10:00:00Z",
  resources: [
    { ...base, id: `${CORE}:azurerm_resource_group.rg`, label: "pagopa-p-monitor-rg", ltype: "resource_group", tf_type: "azurerm_resource_group", address: "azurerm_resource_group.rg", repo: "pagopa-infra-core", stack: "src/core", parent: null },
    { ...base, id: `${CORE}:azurerm_application_insights.appi`, label: "pagopa-p-appinsights", ltype: "monitoring", tf_type: "azurerm_application_insights", address: "azurerm_application_insights.appi", repo: "pagopa-infra-core", stack: "src/core", parent: `${CORE}:azurerm_resource_group.rg` },
    { ...base, id: `${CORE}:azurerm_monitor_action_group.slack`, label: "SlackPagoPA", ltype: "action_group", tf_type: "azurerm_monitor_action_group", address: "azurerm_monitor_action_group.slack", repo: "pagopa-infra-core", stack: "src/core", parent: null },
    { ...base, id: `${APP}:module.api`, label: "pagopa-p-weu-gpd-payments-api", ltype: "api_gateway", tf_type: "api_management_api", address: "module.api", repo: "pagopa-infra", stack: "src/domains/gps-app", parent: null, node: "pagopa-gpd-payments" },
    { ...base, id: `${APP}:azurerm_monitor_scheduled_query_rules_alert.avail`, label: "gpd-availability", ltype: "monitoring", tf_type: "azurerm_monitor_scheduled_query_rules_alert", address: "azurerm_monitor_scheduled_query_rules_alert.avail", repo: "pagopa-infra", stack: "src/domains/gps-app", parent: null },
  ],
  links: [
    { from: `${APP}:module.api`, to: `${CORE}:azurerm_application_insights.appi`, kind: "ref", origin: "inferred", evidence: {} },
  ],
  monitoring: {
    alerts: [
      {
        id: `${APP}:azurerm_monitor_scheduled_query_rules_alert.avail`, label: "gpd-availability", severity: 1, kind: "log",
        targets: [`${CORE}:azurerm_application_insights.appi`], action_groups: [`${CORE}:azurerm_monitor_action_group.slack`],
      },
    ],
    action_groups: [{ id: `${CORE}:azurerm_monitor_action_group.slack`, label: "SlackPagoPA", channels: ["slack"] }],
    dashboards: [],
  },
};

const DETAIL: EaInfraResourceDetail = {
  ...VIEW.resources[3],
  names: { prod: "pagopa-p-weu-gpd-payments-api" },
  locations: { prod: "westeurope" },
  status: "active",
  node_name: "GPD Payments",
  children: 0,
  out: [{ id: `${CORE}:azurerm_application_insights.appi`, label: "pagopa-p-appinsights", ltype: "monitoring", kind: "ref", origin: "inferred", envs: ["prod"], evidence: {} }],
  in: [],
  file_url: "https://github.com/pagopa/pagopa-infra/blob/HEAD/src/domains/gps-app/main.tf",
};

function setup(selected: string | null) {
  const onSelect = vi.fn();
  const openNode = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EaInfra g={buildGraph(KB)} selected={selected} onSelect={onSelect} openNode={openNode} />
    </QueryClientProvider>,
  );
  return { onSelect, openNode };
}

describe("EaInfra", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
    mocks.apiClient.mockImplementation((url: string) =>
      Promise.resolve(url.includes("/infra/resources/") ? DETAIL : VIEW),
    );
  });

  it("starts top-down, by layers, and opens a domain", async () => {
    const { onSelect } = setup(null);
    expect(await screen.findByRole("region", { name: "Livello Ingresso" })).toBeInTheDocument();
    const api = screen.getByRole("region", { name: "Livello API" });
    expect(within(api).getByText("pagopa-p-weu-gpd-payments-api")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^gps/ }));
    expect(onSelect).toHaveBeenCalledWith("dom:gps");
    fireEvent.click(screen.getByRole("radio", { name: "Per stack Terraform" }));
    expect(onSelect).toHaveBeenCalledWith("stk:");
  });

  it("shows the stacks of the environment and the monitoring chain", async () => {
    const { onSelect } = setup("stk:");
    expect(await screen.findByRole("button", { name: /gps-app/ })).toBeInTheDocument();
    expect(mocks.apiClient).toHaveBeenCalledWith("/api/v1/ea/infra?env=prod");
    const chain = screen.getByRole("table", { name: "Catena di monitoring" });
    expect(within(chain).getByText("gpd-availability")).toBeInTheDocument();
    expect(within(chain).getByText("SlackPagoPA")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /gps-app/ }));
    expect(onSelect).toHaveBeenCalledWith(`stk:${APP}`);
  });

  it("filters the stack overview by type and by search", async () => {
    setup("stk:");
    expect(await screen.findByRole("button", { name: /gps-app/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^core/ })).toBeInTheDocument();
    const types = screen.getByRole("group", { name: "Filtra per tipo" });
    fireEvent.click(within(types).getByRole("button", { name: /API Gateway/ }));
    expect(screen.getByRole("status")).toHaveTextContent("1 risorse corrispondono ai filtri, in 1 stack");
    expect(screen.getByRole("button", { name: /gps-app.*1 di 1 risorse/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^core/ })).not.toBeInTheDocument();
    fireEvent.click(within(types).getByRole("button", { name: /Azzera filtri/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Cerca una risorsa" }), { target: { value: "nothing-like-this" } });
    expect(screen.getByRole("status")).toHaveTextContent("Nessuna risorsa corrisponde ai filtri.");
  });

  it("switches environment", async () => {
    setup(null);
    fireEvent.click(await screen.findByRole("radio", { name: "Dev" }));
    expect(mocks.apiClient).toHaveBeenCalledWith("/api/v1/ea/infra?env=dev");
  });

  it("draws a stack with its neighbours and opens a resource with its links to the map", async () => {
    const { openNode } = setup(`stk:${APP}`);
    fireEvent.click(await screen.findByRole("button", { name: /pagopa-p-weu-gpd-payments-api/ }));
    expect(await screen.findByRole("navigation", { name: "Percorso" })).toHaveTextContent("src/domains/gps-app");
    expect(screen.getByRole("complementary", { name: "Risorse di altri stack collegate" })).toHaveTextContent("pagopa-p-appinsights");
    const panel = await screen.findByRole("dialog", { name: "Dettaglio della risorsa" });
    fireEvent.click(await within(panel).findByRole("button", { name: /Apri nella mappa: GPD Payments/ }));
    expect(openNode).toHaveBeenCalledWith("pagopa-gpd-payments");
    expect(within(panel).getByText("dedotta")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /File Terraform/ })).toHaveAttribute("href", DETAIL.file_url);
  });
});
