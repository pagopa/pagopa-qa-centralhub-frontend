/** Data Lake view of the EA Map: columns, lineage chain and filters (pure functions). */
import type { EaDataset, EaDatasetLayer, EaEdge, EaNode } from "@/types/ea";
import type { EaGraph } from "./graph";

export const DATA_EDGE_TYPES = new Set(["produces", "derives", "feeds"]);

export type DlColumnKey = "sources" | "ingestion" | "silver" | "gold" | "consumers";

export const DL_COLUMNS: { key: DlColumnKey; title: string; hint: string }[] = [
  { key: "sources", title: "Sorgenti", hint: "Componenti e prodotti che inviano i dati" },
  { key: "ingestion", title: "Ingestion", hint: "Dati in ingresso (topic Event Hub → bronze)" },
  { key: "silver", title: "Silver", hint: "Tabelle pulite e integrate" },
  { key: "gold", title: "Gold ed export", hint: "Tabelle per l'analisi e file verso l'esterno" },
  { key: "consumers", title: "Consumer", hint: "Chi usa i dati" },
];

export const LAYER_LABEL: Record<EaDatasetLayer, string> = {
  ingestion: "INGESTION",
  silver: "SILVER",
  gold: "GOLD",
  export: "EXPORT",
};

export const DOMAIN_LABEL: Record<string, string> = {
  biz: "Biz Events",
  gpd: "GPD",
  fdr: "FdR",
  gec: "GEC",
  wallet: "Wallet",
  observability: "Observability",
  payments: "Payments",
  forecast: "Forecast",
};

export const domainLabel = (d: string | null | undefined) => (d ? DOMAIN_LABEL[d] ?? d : "Altro");

export function datasets(g: EaGraph): EaDataset[] {
  return g.kb.nodes.filter((n): n is EaDataset => n.type === "dataset");
}

export function dataEdges(g: EaGraph): EaEdge[] {
  return g.kb.edges.filter((e) => DATA_EDGE_TYPES.has(e.type));
}

export function layerColumn(layer: EaDatasetLayer): DlColumnKey {
  return layer === "export" ? "gold" : layer;
}

export interface DlFilters {
  domain: string | null;
  uncontracted: boolean;
  noProducer: boolean;
  /** Datasets with a contract and no control in the DQ Framework of the Hub. */
  noDq?: boolean;
}

export const NO_FILTERS: DlFilters = { domain: null, uncontracted: false, noProducer: false, noDq: false };

export function producersOf(g: EaGraph, datasetId: string): string[] {
  return (g.inEdges.get(datasetId) ?? []).filter((e) => e.type === "produces").map((e) => e.from);
}

export function domains(g: EaGraph): { key: string; n: number }[] {
  const count = new Map<string, number>();
  for (const d of datasets(g)) {
    const k = d.domain ?? "";
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  return [...count]
    .map(([key, n]) => ({ key, n }))
    .sort((a, b) => domainLabel(a.key).localeCompare(domainLabel(b.key)));
}

export interface DlLayout {
  columns: Record<DlColumnKey, { domain: string | null; nodes: EaNode[] }[]>;
  edges: EaEdge[];
  shown: Set<string>;
}

const byName = (a: EaNode, b: EaNode) => a.name.localeCompare(b.name, "it");

/**
 * Nodes per column. Datasets are grouped by domain; sources and consumers are the nodes
 * linked to the visible datasets.
 */
export function layout(g: EaGraph, f: DlFilters = NO_FILTERS): DlLayout {
  const visible = datasets(g).filter(
    (d) =>
      (f.domain === null || (d.domain ?? "") === f.domain) &&
      (!f.uncontracted || !d.contracted) &&
      (!f.noProducer || (d.layer === "ingestion" && producersOf(g, d.id).length === 0)) &&
      (!f.noDq || (d.contracted && !(d.dq ?? 0))),
  );
  const ids = new Set(visible.map((d) => d.id));
  const edges = dataEdges(g).filter((e) => ids.has(e.from) || ids.has(e.to));
  const sources = new Set<string>();
  const consumers = new Set<string>();
  for (const e of edges) {
    if (e.type === "produces" && ids.has(e.to)) sources.add(e.from);
    if (e.type === "feeds" && ids.has(e.from)) consumers.add(e.to);
  }
  const plain = (set: Set<string>) =>
    [...set]
      .map((id) => g.byId.get(id))
      .filter((n): n is EaNode => !!n)
      .sort(byName);

  const grouped = (key: DlColumnKey) => {
    const inCol = visible.filter((d) => layerColumn(d.layer) === key);
    const groups = new Map<string, EaDataset[]>();
    for (const d of inCol) {
      const k = d.domain ?? "";
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(d);
    }
    return [...groups]
      .sort(([a], [b]) => domainLabel(a).localeCompare(domainLabel(b)))
      .map(([domain, nodes]) => ({ domain: domain || null, nodes: nodes.sort(byName) as EaNode[] }));
  };

  const columns: DlLayout["columns"] = {
    sources: [{ domain: null, nodes: plain(sources) }],
    ingestion: grouped("ingestion"),
    silver: grouped("silver"),
    gold: grouped("gold"),
    consumers: [{ domain: null, nodes: plain(consumers) }],
  };
  const shown = new Set<string>([...ids, ...sources, ...consumers]);
  return { columns, edges: edges.filter((e) => shown.has(e.from) && shown.has(e.to)), shown };
}

/** Everything upstream and downstream of a node along the data edges. */
export function lineage(g: EaGraph, id: string): Set<string> {
  const edges = dataEdges(g);
  const out = new Set<string>([id]);
  const walk = (dir: "down" | "up") => {
    const queue = [id];
    const seen = new Set<string>([id]);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const e of edges) {
        const next = dir === "down" ? (e.from === cur ? e.to : null) : e.to === cur ? e.from : null;
        if (next && !seen.has(next)) {
          seen.add(next);
          out.add(next);
          queue.push(next);
        }
      }
    }
  };
  walk("down");
  walk("up");
  return out;
}

export interface DlStats {
  datasets: number;
  ingestion: number;
  silver: number;
  gold: number;
  export: number;
  uncontracted: number;
  noProducer: number;
  pii: number;
  withDq: number;
}

export function stats(g: EaGraph): DlStats {
  const ds = datasets(g);
  const by = (layer: EaDatasetLayer) => ds.filter((d) => d.layer === layer).length;
  return {
    datasets: ds.filter((d) => d.contracted).length,
    ingestion: by("ingestion"),
    silver: by("silver"),
    gold: by("gold"),
    export: by("export"),
    uncontracted: ds.filter((d) => !d.contracted).length,
    noProducer: ds.filter((d) => d.layer === "ingestion" && producersOf(g, d.id).length === 0).length,
    pii: ds.filter((d) => d.pii > 0).length,
    withDq: ds.filter((d) => (d.dq ?? 0) > 0).length,
  };
}
