import { describe, expect, it } from "vitest";
import type { EaDataset, EaKb } from "@/types/ea";
import { buildGraph, searchNodes } from "./graph";
import { datasets, domains, layout, lineage, stats } from "./datalake";

const ds = (id: string, layer: EaDataset["layer"], domain: string, extra: Partial<EaDataset> = {}): EaDataset => ({
  id,
  type: "dataset",
  name: id.split(":").pop()!,
  desc: "",
  layer,
  domain,
  contracted: true,
  table: layer === "ingestion" ? null : `pagopa.${id.split(":").pop()}`,
  topic: layer === "ingestion" ? `${domain}-topic` : null,
  owner: "Data Lake Team",
  version: "0.0.1",
  url: null,
  fields: 3,
  pii: 0,
  checks: 1,
  ...extra,
});

const kb: EaKb = {
  meta: {},
  nodes: [
    { id: "ext-bi", type: "external", name: "Business Intelligence", desc: "" },
    { id: "ext-mef", type: "external", name: "MEF", desc: "" },
    ds("dc:biz:positive", "ingestion", "biz", { pii: 2 }),
    ds("dc:gpd:position", "ingestion", "gpd"),
    ds("dl:silver_positive", "silver", "biz", { contracted: false, checks: 0 }),
    ds("dc:gold:payments", "gold", "biz"),
    ds("dc:mef:tari", "export", "biz"),
  ],
  edges: [
    { from: "dc:biz:positive", to: "dl:silver_positive", type: "derives" },
    { from: "dl:silver_positive", to: "dc:gold:payments", type: "derives" },
    { from: "dl:silver_positive", to: "dc:mef:tari", type: "derives" },
    { from: "dc:gold:payments", to: "ext-bi", type: "feeds" },
    { from: "dc:mef:tari", to: "ext-mef", type: "feeds" },
    { from: "pagopa-biz-events-service", to: "dc:biz:positive", type: "produces" },
  ],
} as unknown as EaKb;
kb.nodes.push({
  id: "pagopa-biz-events-service",
  type: "component",
  parent: "prod:biz",
  name: "Biz Events Service",
} as unknown as EaKb["nodes"][number]);

const g = buildGraph(kb);
const ids = (nodes: { id: string }[]) => nodes.map((n) => n.id);

describe("data lake view", () => {
  it("places nodes in columns, datasets grouped by domain", () => {
    const lay = layout(g);
    expect(ids(lay.columns.sources[0].nodes)).toEqual(["pagopa-biz-events-service"]);
    expect(lay.columns.ingestion.map((gr) => [gr.domain, ids(gr.nodes)])).toEqual([
      ["biz", ["dc:biz:positive"]],
      ["gpd", ["dc:gpd:position"]],
    ]);
    expect(ids(lay.columns.silver[0].nodes)).toEqual(["dl:silver_positive"]);
    // export goes with gold
    expect(ids(lay.columns.gold[0].nodes).sort()).toEqual(["dc:gold:payments", "dc:mef:tari"]);
    expect(ids(lay.columns.consumers[0].nodes)).toEqual(["ext-bi", "ext-mef"]);
    expect(lay.edges).toHaveLength(6);
  });

  it("filters by domain, missing contract and missing producer", () => {
    const gpd = layout(g, { domain: "gpd", uncontracted: false, noProducer: false });
    expect([...gpd.shown]).toEqual(["dc:gpd:position"]);
    const unc = layout(g, { domain: null, uncontracted: true, noProducer: false });
    expect([...unc.shown]).toEqual(["dl:silver_positive"]);
    const orphan = layout(g, { domain: null, uncontracted: false, noProducer: true });
    expect([...orphan.shown]).toEqual(["dc:gpd:position"]);
  });

  it("follows the chain upstream and downstream", () => {
    const chain = lineage(g, "dl:silver_positive");
    expect([...chain].sort()).toEqual(
      [
        "dc:biz:positive",
        "dc:gold:payments",
        "dc:mef:tari",
        "dl:silver_positive",
        "ext-bi",
        "ext-mef",
        "pagopa-biz-events-service",
      ].sort(),
    );
    expect([...lineage(g, "dc:gpd:position")]).toEqual(["dc:gpd:position"]);
  });

  it("counts and searches datasets", () => {
    expect(stats(g)).toMatchObject({ datasets: 4, ingestion: 2, silver: 1, gold: 1, export: 1, uncontracted: 1, noProducer: 1, pii: 1 });
    expect(domains(g)).toEqual([
      { key: "biz", n: 4 },
      { key: "gpd", n: 1 },
    ]);
    expect(datasets(g)).toHaveLength(5);
    expect(searchNodes(g, "gpd-topic").map((n) => n.id)).toEqual(["dc:gpd:position"]);
  });
});
