import { describe, expect, it } from "vitest";
import type { EaKb } from "@/types/ea";
import { ApiError } from "@/lib/api";
import { buildGraph } from "./graph";
import { bestRoute, errorMessage, expandHighlight, highlightCss, parseAnswer } from "./assist";

const comp = (id: string, parent: string) =>
  ({
    id, type: "component", parent, name: id, desc: "", kind: "be", kindLabel: "", repo: "", private: false,
    lang: [], fw: [], ns: null, ingress: null, owners: [], apis: [], readme: "", workflows: [], confRepo: [],
    qa: { unit: 0, it_repo: 0, it_wf: false, perf_repo: false, sonar: false, central: [], nrt: [],
      tas: false, tas_ci: null, nodo_bdd: false, under_qa: null, score: 0 },
  }) as const;

const KB = {
  meta: {},
  nodes: [
    { id: "area:core", type: "area", name: "Core", desc: "" },
    { id: "prod:gpd", type: "product", parent: "area:core", name: "GPD", desc: "", domain: null, conf: [] },
    { id: "prod:nodo", type: "product", parent: "area:core", name: "Nodo", desc: "", domain: null, conf: [] },
    comp("gpd-core", "prod:gpd"),
    comp("gpd-pay", "prod:gpd"),
    comp("nodo-core", "prod:nodo"),
    { id: "ext-io", type: "external", name: "IO", desc: "" },
  ],
  edges: [],
  blueprint: { segments: [], services: [], functions: [], processes: [], infra: [], prodInfra: {}, risk: {}, riskSrc: null, panels: {} },
} as unknown as EaKb;

describe("assistant helpers", () => {
  const g = buildGraph(KB);

  it("expands a highlight to the containing product and area", () => {
    expect([...expandHighlight(g, ["gpd-core", "ext-io", "unknown"])].sort()).toEqual(
      ["area:core", "ext-io", "gpd-core", "prod:gpd", "unknown"],
    );
  });

  it("builds escaped CSS selectors for map and blueprint items", () => {
    const css = highlightCss(["prod:gpd", 'we"ird'], "hl");
    expect(css).toContain('[data-nid="prod:gpd"]');
    expect(css).toContain('[data-bp="we\\"ird"]');
    expect(highlightCss([], "hl")).toBe("");
  });

  it("chooses the view that shows the highlighted nodes", () => {
    expect(bestRoute(g, ["gpd-core", "gpd-pay"])).toEqual({ view: "map", nodeId: "prod:gpd" });
    expect(bestRoute(g, ["gpd-core", "nodo-core"])).toEqual({ view: "map", nodeId: null });
    expect(bestRoute(g, ["sv-avviso", "pr-m3"])).toEqual({ view: "blueprint", nodeId: null });
  });

  it("parses paragraphs, bullets, bold and node references", () => {
    const blocks = parseAnswer("Chi chiama **GPD**:\n- [[gpd-pay]] (diretto)\n- [[nodo-core]]\n\nFine.");
    expect(blocks).toEqual([
      { t: "p", inl: [{ t: "text", v: "Chi chiama " }, { t: "bold", v: "GPD" }, { t: "text", v: ":" }] },
      { t: "ul", items: [[{ t: "ref", id: "gpd-pay" }, { t: "text", v: " (diretto)" }], [{ t: "ref", id: "nodo-core" }]] },
      { t: "p", inl: [{ t: "text", v: "Fine." }] },
    ]);
  });

  it("uses the backend detail as error message", () => {
    expect(errorMessage(new ApiError(503, { detail: "Assistente non configurato" }), "x")).toBe("Assistente non configurato");
    expect(errorMessage(new Error("boom"), "Errore")).toBe("Errore");
  });
});
