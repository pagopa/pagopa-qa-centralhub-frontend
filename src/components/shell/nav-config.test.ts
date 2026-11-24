import { describe, expect, it } from "vitest";
import { matchesQuery, NAV_SECTIONS, type NavSectionConfig } from "./nav-config";

const section = (id: string) => NAV_SECTIONS.find((s) => s.id === id) as NavSectionConfig;
const labels = (id: string) => section(id).items.map((i) => i.label);

describe("NAV_SECTIONS", () => {
  it("has the eight sections in order", () => {
    expect(NAV_SECTIONS.map((s) => s.id)).toEqual([
      "workspace", "architecture", "design", "results", "release", "data", "knowledge", "admin",
    ]);
  });

  it("only admin is closed by default", () => {
    expect(NAV_SECTIONS.filter((s) => s.defaultClosed).map((s) => s.id)).toEqual(["admin"]);
  });

  it("puts EA Map alone in architecture", () => {
    expect(labels("architecture")).toEqual(["EA Map"]);
    expect(labels("design")).toEqual(["Gherkin Generator", "Test Lifecycle"]);
  });

  it("keeps sapere and admin separate", () => {
    expect(labels("knowledge")).toEqual(["Docs & Decks", "API Docs"]);
    expect(labels("admin")).toEqual([
      "Settings Gherkin", "Settings Utenti", "Settings Pagoda", "Risorse T&M",
    ]);
  });

  it("maps each remaining entry to the agreed section", () => {
    expect(labels("workspace")).toEqual(["Overview", "Messaggi"]);
    expect(labels("results")).toEqual([
      "SANP Health", "Non-Regression Tests (NRT)", "Scenari flaky",
      "Test Automation Service (TAS)", "Quality Gate", "NRT Metrics",
    ]);
    expect(labels("release")).toEqual(["Status Page", "KPI Jira"]);
    expect(labels("data")).toEqual([
      "PSP Commissioni", "Posizioni Debitorie GPD", "Catalogo Controlli", "Controlli per Dominio",
    ]);
  });

  it("has no duplicate routes, labels or icons", () => {
    const items = NAV_SECTIONS.flatMap((s) => s.items);
    const hrefs = items.map((i) => i.href).filter(Boolean);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(items.map((i) => i.label)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.icon)).size).toBe(items.length);
  });
});

describe("matchesQuery", () => {
  const data = section("data");
  const posizioni = data.items.find((i) => i.label.startsWith("Posizioni"))!;

  it("matches everything for an empty query", () => {
    expect(matchesQuery(data, posizioni, "")).toBe(true);
    expect(matchesQuery(data, posizioni, "   ")).toBe(true);
  });

  it("ignores case and accents, on item and section labels", () => {
    expect(matchesQuery(data, posizioni, "POSIZIONI")).toBe(true);
    expect(matchesQuery(section("data"), data.items[0], "qualita")).toBe(true);
  });

  it("matches an accented query against accented and plain labels", () => {
    expect(matchesQuery(data, posizioni, "qualità")).toBe(true);
    expect(matchesQuery(data, posizioni, "QUALITÀ")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesQuery(data, posizioni, "zzz")).toBe(false);
  });
});
