import { describe, expect, it } from "vitest";
import type { EaKb } from "@/types/ea";
import {
  buildGraph,
  decodeRoute,
  encodeRoute,
  processScore,
  productStats,
  searchNodes,
  traceBlueprint,
} from "./graph";

const qa = (score: number, extra: Partial<EaKb["nodes"][number]> = {}) => ({
  unit: score > 0 ? 1 : 0,
  it_repo: 0,
  it_wf: false,
  perf_repo: false,
  e2e_repo: false,
  sonar: false,
  central: [],
  nrt: [],
  tas: false,
  tas_ci: null,
  nodo_bdd: false,
  under_qa: null,
  score,
  ...extra,
});

const comp = (id: string, parent: string, kind: "be" | "lib", score: number) => ({
  id,
  type: "component" as const,
  parent,
  name: id.toUpperCase(),
  desc: "",
  kind,
  kindLabel: "",
  repo: "",
  private: false,
  lang: [],
  fw: [],
  ns: null,
  ingress: null,
  owners: [],
  apis: [],
  readme: "",
  workflows: [],
  confRepo: [],
  qa: qa(score),
});

const KB: EaKb = {
  meta: {},
  nodes: [
    { id: "area:core", type: "area", name: "Nodo", desc: "" },
    { id: "prod:nodo", type: "product", parent: "area:core", name: "NdP – Nodo", desc: "", domain: "nodo", conf: [] },
    comp("svc-a", "prod:nodo", "be", 4),
    comp("svc-b", "prod:nodo", "be", 2),
    comp("lib-c", "prod:nodo", "lib", 0),
  ],
  edges: [{ from: "svc-a", to: "svc-b", type: "api" }],
  blueprint: {
    segments: [{ id: "seg-psp", name: "PSP", who: [], actors: [] }],
    services: [{ id: "sv-pay", name: "Pagamento", seg: ["seg-psp"], proc: ["pr-m3"] }],
    functions: [{ id: "fn-att", name: "Attivazione" }],
    processes: [{ id: "pr-m3", name: "Modello 3", fn: "fn-att", prod: ["nodo"], ref: null, suites: [] }],
    infra: [{ id: "ns-nodo", name: "nodo", group: "aks", desc: "" }],
    prodInfra: { nodo: ["ns-nodo"] },
    risk: {},
    riskSrc: null,
    panels: {},
  },
};

describe("ea-map graph", () => {
  const g = buildGraph(KB);

  it("averages maturity over runtime components only", () => {
    const s = productStats(g, "prod:nodo");
    expect(s.n).toBe(3);
    expect(s.base).toBe(2);
    expect(s.avg).toBe(3);
    expect(processScore(g, ["nodo"])).toBe(3);
  });

  it("traces the full vertical chain from a service", () => {
    const t = traceBlueprint(g, KB.blueprint, "sv-pay");
    expect([...t.ids].sort()).toEqual(["fn-att", "ns-nodo", "pr-m3", "prod:nodo", "seg-psp", "sv-pay"]);
    expect(t.wires).toContainEqual(["pr-m3", "prod:nodo"]);
  });

  it("traces upwards from an infrastructure resource", () => {
    const t = traceBlueprint(g, KB.blueprint, "ns-nodo");
    expect(t.ids.has("sv-pay")).toBe(true);
    expect(t.ids.has("seg-psp")).toBe(true);
  });

  it("round-trips hash routes", () => {
    for (const r of [
      { view: "blueprint", nodeId: null },
      { view: "qa", nodeId: null },
      { view: "map", nodeId: null },
      { view: "map", nodeId: "prod:gpd" },
      { view: "map", nodeId: "area:core" },
      { view: "map", nodeId: "pagopa-fdr" },
    ] as const) {
      expect(decodeRoute(`#${encodeRoute(r)}`)).toEqual(r);
    }
  });

  it("keeps the architecture root distinct from the blueprint", () => {
    expect(encodeRoute({ view: "map", nodeId: null })).toBe("map");
    expect(decodeRoute("")).toEqual({ view: "blueprint", nodeId: null });
  });

  it("ranks name matches first", () => {
    expect(searchNodes(g, "svc").map((n) => n.id)).toEqual(["svc-a", "svc-b"]);
    expect(searchNodes(g, "")).toEqual([]);
  });
});
