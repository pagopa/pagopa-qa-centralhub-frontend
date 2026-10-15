import type {
  EaArea,
  EaBlueprint,
  EaComponent,
  EaComponentKind,
  EaEdge,
  EaKb,
  EaNode,
  EaProduct,
} from "@/types/ea";

export const RUNTIME_KINDS: ReadonlySet<EaComponentKind> = new Set(["be", "fn", "fe"]);
export const KIND_ORDER: EaComponentKind[] = ["fe", "be", "fn", "lib", "mock", "test", "tool", "infra", "doc"];
export const KIND_GROUP: Record<EaComponentKind, string> = {
  fe: "Frontend",
  be: "Microservizi",
  fn: "Azure Functions",
  lib: "Librerie",
  mock: "Mock",
  test: "Test",
  tool: "Tool",
  infra: "Infrastruttura",
  doc: "Doc & spec",
};
export const KIND_BADGE: Record<EaComponentKind, string> = {
  fe: "FE",
  be: "MS",
  fn: "FN",
  lib: "LIB",
  mock: "MOCK",
  test: "TEST",
  tool: "TOOL",
  infra: "IAC",
  doc: "DOC",
};

export const isRuntime = (c: EaComponent) => RUNTIME_KINDS.has(c.kind);
export const shortName = (name: string) => name.split(" – ")[0];

export interface EaGraph {
  kb: EaKb;
  byId: Map<string, EaNode>;
  children: Map<string, EaNode[]>;
  components: EaComponent[];
  areas: EaArea[];
  products: EaProduct[];
  outEdges: Map<string, EaEdge[]>;
  inEdges: Map<string, EaEdge[]>;
}

export function buildGraph(kb: EaKb): EaGraph {
  const byId = new Map<string, EaNode>();
  const children = new Map<string, EaNode[]>();
  const outEdges = new Map<string, EaEdge[]>();
  const inEdges = new Map<string, EaEdge[]>();
  for (const n of kb.nodes) {
    byId.set(n.id, n);
    const parent = "parent" in n ? n.parent : undefined;
    if (parent) {
      const list = children.get(parent) ?? [];
      list.push(n);
      children.set(parent, list);
    }
  }
  for (const e of kb.edges) {
    (outEdges.get(e.from) ?? outEdges.set(e.from, []).get(e.from)!).push(e);
    (inEdges.get(e.to) ?? inEdges.set(e.to, []).get(e.to)!).push(e);
  }
  return {
    kb,
    byId,
    children,
    components: kb.nodes.filter((n): n is EaComponent => n.type === "component"),
    areas: kb.nodes.filter((n): n is EaArea => n.type === "area"),
    products: kb.nodes.filter((n): n is EaProduct => n.type === "product"),
    outEdges,
    inEdges,
  };
}

export function kidsOf<T extends EaNode = EaNode>(g: EaGraph, id: string): T[] {
  return (g.children.get(id) ?? []) as T[];
}

export function productOf(g: EaGraph, c: EaComponent): EaProduct {
  return g.byId.get(c.parent) as EaProduct;
}

export function areaOf(g: EaGraph, n: EaNode): EaArea | undefined {
  if (n.type === "component") return g.byId.get(productOf(g, n).parent) as EaArea;
  if (n.type === "product") return g.byId.get(n.parent) as EaArea;
  if (n.type === "area") return n;
  return undefined;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const hasIntegration = (c: EaComponent) => c.qa.it_repo > 0 || c.qa.it_wf || c.qa.nodo_bdd;

export interface ProductStats {
  n: number;
  base: number;
  avg: number;
  it: number;
  tas: number;
  nrt: number;
  perf: number;
}

export function productStats(g: EaGraph, productId: string): ProductStats {
  const cs = kidsOf<EaComponent>(g, productId);
  const rt = cs.filter(isRuntime);
  const base = rt.length ? rt : cs;
  return {
    n: cs.length,
    base: base.length,
    avg: avg(base.map((c) => c.qa.score)),
    it: base.filter(hasIntegration).length,
    tas: base.filter((c) => c.qa.tas).length,
    nrt: base.filter((c) => c.qa.nrt.length > 0).length,
    perf: base.filter((c) => c.qa.perf_repo).length,
  };
}

export function areaStats(g: EaGraph, areaId: string) {
  const ps = kidsOf<EaProduct>(g, areaId);
  const cs = ps.flatMap((p) => kidsOf<EaComponent>(g, p.id));
  const rt = cs.filter(isRuntime);
  return { p: ps.length, n: cs.length, avg: avg(rt.map((c) => c.qa.score)) };
}

export function runtimeComponentsOfProduct(g: EaGraph, productId: string): EaComponent[] {
  return kidsOf<EaComponent>(g, productId).filter(isRuntime);
}

export function processScore(g: EaGraph, productKeys: string[]): number {
  return avg(productKeys.flatMap((k) => runtimeComponentsOfProduct(g, `prod:${k}`)).map((c) => c.qa.score));
}

export function hasIntegrationTests(c: EaComponent): boolean {
  return hasIntegration(c) || c.qa.tas;
}

/* ── Blueprint tracing ─────────────────────────────────────────── */

export type BpLevel = "seg" | "svc" | "fn" | "proc" | "app" | "area" | "inf";

export interface BpItem {
  id: string;
  name: string;
  level: BpLevel;
}

export function blueprintIndex(g: EaGraph): Map<string, BpItem> {
  const bp = g.kb.blueprint;
  const idx = new Map<string, BpItem>();
  bp.segments.forEach((x) => idx.set(x.id, { id: x.id, name: x.name, level: "seg" }));
  bp.services.forEach((x) => idx.set(x.id, { id: x.id, name: x.name, level: "svc" }));
  bp.functions.forEach((x) => idx.set(x.id, { id: x.id, name: x.name, level: "fn" }));
  bp.processes.forEach((x) => idx.set(x.id, { id: x.id, name: x.name, level: "proc" }));
  bp.infra.forEach((x) => idx.set(x.id, { id: x.id, name: x.name, level: "inf" }));
  g.products.forEach((p) => idx.set(p.id, { id: p.id, name: p.name, level: "app" }));
  g.areas.forEach((a) => idx.set(a.id, { id: a.id, name: a.name, level: "area" }));
  return idx;
}

export interface Trace {
  ids: Set<string>;
  wires: [string, string][];
}

/** Vertical chain (segment → service → process → product → infra) touching `id`. */
export function traceBlueprint(g: EaGraph, bp: EaBlueprint, id: string): Trace {
  const ids = new Set<string>([id]);
  const wires: [string, string][] = [];
  const add = (a: string, b: string) => {
    ids.add(a);
    ids.add(b);
    wires.push([a, b]);
  };
  const procById = new Map(bp.processes.map((p) => [p.id, p]));
  const down = (procIds: string[]) =>
    procIds.forEach((prId) => {
      const pr = procById.get(prId);
      if (!pr) return;
      add(pr.fn, prId);
      pr.prod.forEach((k) => {
        add(prId, `prod:${k}`);
        (bp.prodInfra[k] ?? []).forEach((i) => add(`prod:${k}`, i));
      });
    });
  const upFromProc = (prId: string) =>
    bp.services
      .filter((s) => s.proc.includes(prId))
      .forEach((s) => {
        add(s.id, prId);
        s.seg.forEach((seg) => add(seg, s.id));
      });
  const fromProducts = (keys: string[]) =>
    keys.forEach((k) => {
      (bp.prodInfra[k] ?? []).forEach((i) => add(`prod:${k}`, i));
      bp.processes
        .filter((p) => p.prod.includes(k))
        .forEach((p) => {
          add(p.id, `prod:${k}`);
          add(p.fn, p.id);
          upFromProc(p.id);
        });
    });

  const seg = bp.segments.find((s) => s.id === id);
  const svc = bp.services.find((s) => s.id === id);
  if (seg) {
    bp.services
      .filter((s) => s.seg.includes(id))
      .forEach((s) => {
        add(id, s.id);
        s.proc.forEach((p) => add(s.id, p));
        down(s.proc);
      });
  } else if (svc) {
    svc.seg.forEach((sg) => add(sg, id));
    svc.proc.forEach((p) => add(id, p));
    down(svc.proc);
  } else if (bp.functions.some((f) => f.id === id)) {
    const ps = bp.processes.filter((p) => p.fn === id).map((p) => p.id);
    down(ps);
    ps.forEach(upFromProc);
  } else if (procById.has(id)) {
    down([id]);
    upFromProc(id);
  } else if (id.startsWith("prod:")) {
    fromProducts([id.slice(5)]);
  } else if (id.startsWith("area:")) {
    fromProducts(kidsOf(g, id).map((p) => p.id.slice(5)));
  } else if (bp.infra.some((i) => i.id === id)) {
    fromProducts(Object.entries(bp.prodInfra).filter(([, v]) => v.includes(id)).map(([k]) => k));
  }
  return { ids, wires };
}

/* ── Hash routing (bare tokens only) ───────────────────────────── */

export type EaView = "blueprint" | "map" | "qa" | "guida" | "review";

export interface EaRoute {
  view: EaView;
  nodeId: string | null;
}

export function encodeRoute(r: EaRoute): string {
  if (r.view !== "map") return r.view;
  if (!r.nodeId) return "map";
  if (r.nodeId.startsWith("area:")) return `a-${r.nodeId.slice(5)}`;
  if (r.nodeId.startsWith("prod:")) return `p-${r.nodeId.slice(5)}`;
  return `c-${r.nodeId}`;
}

export function decodeRoute(hash: string): EaRoute {
  const h = hash.replace(/^#/, "");
  if (h === "qa" || h === "guida" || h === "blueprint" || h === "map" || h === "review") return { view: h, nodeId: null };
  if (h.startsWith("a-")) return { view: "map", nodeId: `area:${h.slice(2)}` };
  if (h.startsWith("p-")) return { view: "map", nodeId: `prod:${h.slice(2)}` };
  if (h.startsWith("c-")) return { view: "map", nodeId: h.slice(2) };
  return { view: "blueprint", nodeId: null };
}

/* ── Search ────────────────────────────────────────────────────── */

export function searchNodes(g: EaGraph, query: string, limit = 12): EaNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const rank: Record<string, number> = { area: 0, product: 0.1, component: 0.2, external: 0.3 };
  return g.kb.nodes
    .filter((n) => n.type !== "datastore")
    .map((n) => {
      const extra = n.type === "component" ? ` ${n.ns ?? ""}` : n.type === "product" ? ` ${n.domain ?? ""}` : "";
      const hay = `${n.name} ${n.id} ${n.desc ?? ""}${extra}`.toLowerCase();
      return { n, hay };
    })
    .filter(({ hay }) => terms.every((t) => hay.includes(t)))
    .map(({ n }) => {
      const name = n.name.toLowerCase();
      const r = (name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2) + (rank[n.type] ?? 0.4);
      return { n, r };
    })
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map(({ n }) => n);
}
