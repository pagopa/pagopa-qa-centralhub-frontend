import { describe, expect, it } from "vitest";
import type { DqCatalogControl, DqControlInstance, DqDimension, DqDomain } from "@/types/index";
import { catalogSheets, catalogTileGroups, domainTileGroups, instanceSheets } from "./dq-report";
import { buildXlsx } from "./xlsx";

const dims: DqDimension[] = [
  { id: "d2", name: "Accuratezza", sort_order: 2 },
  { id: "d1", name: "Completezza", sort_order: 1 },
];
const domains: DqDomain[] = [
  { id: "B", name: "GPD", sort_order: 2, created_at: "", updated_at: "" },
  { id: "A", name: "Nodo", sort_order: 1, created_at: "", updated_at: "" },
];

function control(id: string, category: DqCatalogControl["category"], dim: DqDimension): DqCatalogControl {
  return {
    id, category, name: `C-${id}`, description: "desc", dimension_id: dim.id, dimension: dim,
    created_by: "a@x", updated_by: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-02T10:00:00Z",
  };
}

const controls = [
  control("1", "puntuale", dims[1]),
  control("2", "puntuale", dims[0]),
  control("3", "cross_entita", dims[1]),
];

function instance(id: string, c: DqCatalogControl, domain: string, status: DqControlInstance["status"]): DqControlInstance {
  return {
    id, domain_id: domain, catalog_control_id: c.id, catalog_control: c, table_ref: "t", field_ref: "f",
    owner: null, risk: "ALTO", impact: "BASSO", status, notes: null, check_name: `chk_${id}`, soda_url: null,
    created_by: null, updated_by: null, created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z",
  };
}

const instances = [
  instance("i1", controls[0], "A", "attivo"),
  instance("i2", controls[0], "B", "in_sviluppo"),
  instance("i3", controls[2], "A", "attivo"),
];

const values = (groups: ReturnType<typeof catalogTileGroups>, title: string) =>
  Object.fromEntries(groups.find((g) => g.title === title)!.tiles.map((t) => [t.label, t.value]));

describe("dq-report tiles", () => {
  it("counts the catalog by category, dimension and instance status", () => {
    const groups = catalogTileGroups(controls, dims, instances);
    expect(values(groups, "Catalogo")).toEqual({
      "Totale controlli": 3, Puntuali: 2, "Intra-entità": 0, "Cross-entità": 1,
    });
    // dimensions follow sort_order
    expect(groups[1].tiles).toEqual([
      { label: "Completezza", value: 2 },
      { label: "Accuratezza", value: 1 },
    ]);
    expect(values(groups, "Applicazioni nei domini, per stato")).toMatchObject({
      Totale: 3, Attivo: 2, "In sviluppo": 1, "Da implementare": 0,
    });
  });

  it("counts domain instances by domain, category, status and dimension", () => {
    const groups = domainTileGroups(instances, domains, dims);
    expect(groups[0].tiles).toEqual([
      { label: "Totale", value: 3 },
      { label: "Nodo", value: 2 },
      { label: "GPD", value: 1 },
    ]);
    expect(values(groups, "Per categoria")).toEqual({ Puntuali: 2, "Intra-entità": 0, "Cross-entità": 1 });
    expect(values(groups, "Per dimensione")).toEqual({ Completezza: 3, Accuratezza: 0 });
  });
});

describe("dq-report sheets", () => {
  it("makes one catalog sheet per category with the number of uses", () => {
    const sheets = catalogSheets(controls, instances);
    expect(sheets.map((s) => [s.name, s.rows.length])).toEqual([
      ["Puntuali", 3], ["Intra-entità", 1], ["Cross-entità", 2],
    ]);
    expect(sheets[0].rows[1].slice(0, 4)).toEqual(["C-1", "desc", "Completezza", 2]);
  });

  it("makes one instance sheet per category with the domain as first column", () => {
    const sheets = instanceSheets(instances, domains);
    expect(sheets[0].rows.slice(1).map((r) => [r[0], r[3], r[9]])).toEqual([
      ["Nodo", "chk_i1", "Attivo"],
      ["GPD", "chk_i2", "In sviluppo"],
    ]);
  });
});

describe("xlsx", () => {
  it("produces a zip with one worksheet per sheet and escaped text", () => {
    const bytes = buildXlsx([
      { name: "A/B: test", rows: [["h1", "h2"], ["<x & y>", 3]] },
      { name: "a/b: TEST", rows: [["only header"]] },
    ]);
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("xl/worksheets/sheet2.xml");
    expect(text).toContain("&lt;x &amp; y&gt;");
    expect(text).toContain('<sheet name="A B  test"');
    expect(text).toContain('<sheet name="a b  TEST (2)"');
  });
});
