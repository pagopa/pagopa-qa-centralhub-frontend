import { describe, expect, it } from "vitest";
import {
  areaForFilter,
  cellVisual,
  countFilterMatches,
  filterApplications,
  filterParams,
  parseFilterParams,
  syncLabel,
} from "@/lib/release-status";
import type { AppFlag, ApplicationRow, AreaGroup, Cell, SyncStatus } from "@/types/release-status";

function makeCell(overrides: Partial<Cell> = {}): Cell {
  return {
    version: "1.2.3",
    read_status: "OK",
    error_detail: null,
    checked_at: "2026-11-16T10:00:00Z",
    last_ok_at: null,
    version_since: null,
    drift: "EQUAL",
    tests: [],
    ...overrides,
  };
}

function makeApp(name: string, flags: AppFlag[] = [], overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: name,
    name,
    product_id: "p",
    product_key: `key-${name}`,
    repository: `repo-${name}`,
    pipeline_url: null,
    runtime: "AKS",
    ci: "GHA",
    kind: "backend",
    test_object: null,
    ea_node_id: null,
    repo: null,
    envs: { DEV: null, UAT: null, PROD: null },
    flags,
    ...overrides,
  };
}

const groups: AreaGroup[] = [
  {
    area: "CORE",
    products: [
      { id: "p1", name: "Payments", applications: [makeApp("alpha", ["DRIFT"]), makeApp("beta", ["ALIGNED"])] },
      { id: "p2", name: "Receipts", applications: [makeApp("gamma", ["ALIGNED"], { product_key: "rcpt-gw" })] },
    ],
  },
  {
    area: "TOUCHPOINT",
    products: [{ id: "p3", name: "App IO", applications: [makeApp("delta", ["DRIFT"])] }],
  },
];

describe("filterApplications", () => {
  it("matches the product name case-insensitively", () => {
    const result = filterApplications(groups, "CORE", "PAYM", "all");
    expect(result[0].products.map((p) => p.name)).toEqual(["Payments"]);
  });

  it("matches product_key and drops empty products", () => {
    const result = filterApplications(groups, "CORE", "rcpt-gw", "all");
    expect(result[0].products.map((p) => p.name)).toEqual(["Receipts"]);
  });

  it("matches the repository", () => {
    const result = filterApplications(groups, "CORE", "repo-beta", "all");
    expect(result[0].products[0].applications.map((a) => a.name)).toEqual(["beta"]);
  });

  it("keeps only DRIFT-flagged apps with the drift filter", () => {
    const result = filterApplications(groups, "CORE", "", "drift");
    expect(result).toHaveLength(1);
    expect(result[0].products).toHaveLength(1);
    expect(result[0].products[0].applications.map((a) => a.name)).toEqual(["alpha"]);
  });

  it("restricts to the requested area", () => {
    const result = filterApplications(groups, "TOUCHPOINT", "", "all");
    expect(result.map((g) => g.area)).toEqual(["TOUCHPOINT"]);
  });
});

describe("cellVisual", () => {
  it("is loading for a null cell", () => {
    expect(cellVisual(null, "DEV").icon).toBe("loading");
  });

  it("greys an unreachable target that keeps its last version", () => {
    const v = cellVisual(makeCell({ read_status: "ERROR", version: "1.4.2", drift: null }), "UAT");
    expect(v.icon).toBe("error");
    expect(v.muted).toBe(true);
    expect(v.tooltip).toContain("1.4.2");
    expect(v.tooltip).toContain("non raggiungibile");
  });

  it("warns on empty body and missing version", () => {
    expect(cellVisual(makeCell({ read_status: "EMPTY_BODY", version: null }), "DEV").icon).toBe("warning");
    expect(cellVisual(makeCell({ read_status: "NO_VERSION", version: null }), "DEV").icon).toBe("warning");
  });

  it("shows info for a non-semver version", () => {
    expect(cellVisual(makeCell({ version: "main-abc", drift: null }), "REPO").icon).toBe("info");
  });

  it("reports drift for OK cells", () => {
    const v = cellVisual(makeCell({ drift: "BEHIND" }), "PROD");
    expect(v.icon).toBe("ok");
    expect(v.drift).toBe("behind");
    expect(v.muted).toBe(false);
  });
});

describe("syncLabel", () => {
  const now = new Date(2026, 10, 16, 10, 20);
  const base: SyncStatus = {
    status: "OK",
    trigger: "SCHEDULED",
    requested_by: null,
    queued_at: null,
    started_at: null,
    finished_at: null,
    last_success_at: new Date(2026, 10, 16, 10, 15).toISOString(),
    applications_checked: 0,
    reads_failed: 0,
    errors: [],
    in_progress: false,
  };

  it("announces a running sync", () => {
    expect(syncLabel({ ...base, status: "RUNNING", in_progress: true }, now).text).toBe(
      "Sincronizzazione in corso…",
    );
    expect(syncLabel({ ...base, status: "QUEUED", in_progress: true }, now).text).toBe(
      "Sincronizzazione in coda…",
    );
  });

  it("falls back to the last success when a queued or running sync is stale", () => {
    for (const status of ["QUEUED", "RUNNING"] as const) {
      expect(syncLabel({ ...base, status, in_progress: false }, now)).toEqual({
        text: "Ultimo aggiornamento 10:15 · automatico",
        stale: false,
      });
      const old = { ...base, status, in_progress: false, last_success_at: new Date(2026, 10, 16, 9, 30).toISOString() };
      expect(syncLabel(old, now).stale).toBe(true);
    }
  });

  it("labels an automatic sync", () => {
    expect(syncLabel(base, now)).toEqual({ text: "Ultimo aggiornamento 10:15 · automatico", stale: false });
  });

  it("labels a manual sync with the requester", () => {
    const label = syncLabel({ ...base, trigger: "MANUAL", requested_by: "a@b.it" }, now);
    expect(label.text).toBe("Ultimo aggiornamento 10:15 · manuale (a@b.it)");
  });

  it("is stale when the last success is older than 45 minutes", () => {
    const old = { ...base, last_success_at: new Date(2026, 10, 16, 9, 30).toISOString() };
    expect(syncLabel(old, now).stale).toBe(true);
  });

  it("is stale when failed", () => {
    expect(syncLabel({ ...base, status: "FAILED" }, now).stale).toBe(true);
  });
});

describe("area filter matches", () => {
  const unreachable: AreaGroup[] = [
    { area: "CORE", products: [{ id: "c", name: "Core", applications: [makeApp("a", ["ALIGNED"])] }] },
    {
      area: "TOUCHPOINT",
      products: [{ id: "t", name: "Tp", applications: [makeApp("b", ["UNREACHABLE"]), makeApp("c", ["UNREACHABLE"])] }],
    },
  ];

  it("counts the matches of a filter per area", () => {
    expect(countFilterMatches(groups, "drift")).toEqual({ CORE: 1, TOUCHPOINT: 1 });
    expect(countFilterMatches(unreachable, "unreachable")).toEqual({ CORE: 0, TOUCHPOINT: 2 });
  });

  it("picks the first area with a match, falling back to CORE", () => {
    expect(areaForFilter(groups, "drift")).toBe("CORE");
    expect(areaForFilter(unreachable, "unreachable")).toBe("TOUCHPOINT");
    expect(areaForFilter(unreachable, "untested")).toBe("CORE");
    expect(areaForFilter([], "drift")).toBe("CORE");
  });
});

describe("filter params", () => {
  it("round-trips", () => {
    const state = { area: "TOUCHPOINT" as const, q: "pay", filter: "drift" as const };
    expect(parseFilterParams(filterParams(state))).toEqual(state);
  });

  it("falls back to defaults on missing or invalid values", () => {
    expect(parseFilterParams(new URLSearchParams("area=x&filter=y"))).toEqual({
      area: "CORE",
      q: "",
      filter: "all",
    });
    expect(filterParams({ area: "CORE", q: "", filter: "all" }).toString()).toBe("");
  });
});
