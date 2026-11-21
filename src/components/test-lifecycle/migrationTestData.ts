import type { TlMigrationItem, TlMigrationScope } from "@/types/test-lifecycle";

export function migrationItem(o: Partial<TlMigrationItem> = {}): TlMigrationItem {
  return {
    id: "i1", page_id: "p1", page_title: "FEAT_001_FdR3 - Creazione", page_url: "https://wiki.test/p1",
    file_path: "src/fdr3/a.feature", scope_code: "FdR3", number: 1, title: "Creazione",
    status: "implemented", decision: "pending", problems: [], proposal: {}, overrides: {},
    effective: {
      scope_code: "FdR3", number: 1, title: "Creazione", status: "implemented",
      owner_id: null, reviewer_id: null, file_path: "src/fdr3/a.feature",
    },
    feature_id: null, executed_at: null, ...o,
  };
}

export function migrationScope(o: Partial<TlMigrationScope> = {}): TlMigrationScope {
  return {
    scope_code: "FdR3", items: 3, pending: 1, confirmed: 2, excluded: 0, executed: 0,
    with_problems: 1, executed_at: null, pr_number: null, pr_url: null, pr_state: null,
    pr_error: null, confluence_errors: [], ...o,
  };
}
