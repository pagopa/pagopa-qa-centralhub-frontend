/** Totals and Excel rows for the DQ catalog and domain pages. */
import type {
  DqCatalogControl,
  DqCategory,
  DqControlInstance,
  DqControlStatus,
  DqDimension,
  DqDomain,
} from "@/types/index";
import type { XlsxSheet } from "@/lib/xlsx";

export const DQ_CATEGORIES: { value: DqCategory; label: string }[] = [
  { value: "puntuale", label: "Controlli Puntuali" },
  { value: "intra_entita", label: "Controlli Intra-entità" },
  { value: "cross_entita", label: "Controlli Cross-entità" },
];

export const DQ_CATEGORY_SHORT: Record<DqCategory, string> = {
  puntuale: "Puntuali",
  intra_entita: "Intra-entità",
  cross_entita: "Cross-entità",
};

export const DQ_STATUSES: { value: DqControlStatus; label: string }[] = [
  { value: "attivo", label: "Attivo" },
  { value: "in_sviluppo", label: "In sviluppo" },
  { value: "da_implementare", label: "Da implementare" },
  { value: "non_attivo", label: "Non attivo" },
  { value: "eliminato", label: "Eliminato" },
];

const STATUS_LABEL = Object.fromEntries(DQ_STATUSES.map((s) => [s.value, s.label])) as Record<
  DqControlStatus,
  string
>;

export interface DqTile {
  label: string;
  value: number;
}

export interface DqTileGroup {
  title: string;
  tiles: DqTile[];
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

function dimensionTiles(names: string[], dimensions: DqDimension[]): DqTile[] {
  const counts = countBy(names, (n) => n);
  const ordered = [...dimensions].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const tiles = ordered.map((d) => ({ label: d.name, value: counts.get(d.name) ?? 0 }));
  // dimensions referenced by controls but missing from the list still count
  for (const [name, value] of counts) if (!ordered.some((d) => d.name === name)) tiles.push({ label: name, value });
  return tiles;
}

/** Catalog page: catalog controls by category and dimension, plus their instances by status. */
export function catalogTileGroups(
  controls: DqCatalogControl[],
  dimensions: DqDimension[],
  instances: DqControlInstance[],
): DqTileGroup[] {
  const byCategory = countBy(controls, (c) => c.category);
  const byStatus = countBy(instances, (i) => i.status);
  return [
    {
      title: "Catalogo",
      tiles: [
        { label: "Totale controlli", value: controls.length },
        ...DQ_CATEGORIES.map((c) => ({ label: DQ_CATEGORY_SHORT[c.value], value: byCategory.get(c.value) ?? 0 })),
      ],
    },
    { title: "Per dimensione", tiles: dimensionTiles(controls.map((c) => c.dimension?.name ?? "—"), dimensions) },
    {
      title: "Applicazioni nei domini, per stato",
      tiles: [
        { label: "Totale", value: instances.length },
        ...DQ_STATUSES.map((s) => ({ label: s.label, value: byStatus.get(s.value) ?? 0 })),
      ],
    },
  ];
}

/** Domains page: control instances by domain, category, status and dimension. */
export function domainTileGroups(
  instances: DqControlInstance[],
  domains: DqDomain[],
  dimensions: DqDimension[],
): DqTileGroup[] {
  const byDomain = countBy(instances, (i) => i.domain_id);
  const byCategory = countBy(instances, (i) => i.catalog_control?.category ?? "");
  const byStatus = countBy(instances, (i) => i.status);
  const orderedDomains = [...domains].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return [
    {
      title: "Controlli nei domini",
      tiles: [
        { label: "Totale", value: instances.length },
        ...orderedDomains.map((d) => ({ label: d.name, value: byDomain.get(d.id) ?? 0 })),
      ],
    },
    {
      title: "Per categoria",
      tiles: DQ_CATEGORIES.map((c) => ({ label: DQ_CATEGORY_SHORT[c.value], value: byCategory.get(c.value) ?? 0 })),
    },
    { title: "Per stato", tiles: DQ_STATUSES.map((s) => ({ label: s.label, value: byStatus.get(s.value) ?? 0 })) },
    {
      title: "Per dimensione",
      tiles: dimensionTiles(instances.map((i) => i.catalog_control?.dimension?.name ?? "—"), dimensions),
    },
  ];
}

// ── Excel ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

export function catalogSheets(controls: DqCatalogControl[], instances: DqControlInstance[]): XlsxSheet[] {
  const uses = countBy(instances, (i) => i.catalog_control_id);
  return DQ_CATEGORIES.map((cat) => ({
    name: DQ_CATEGORY_SHORT[cat.value],
    rows: [
      ["Nome", "Descrizione", "Dimensione", "Applicazioni nei domini", "Inserito il", "Inserito da", "Modificato il", "Modificato da"],
      ...controls
        .filter((c) => c.category === cat.value)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => [
          c.name,
          c.description,
          c.dimension?.name ?? "",
          uses.get(c.id) ?? 0,
          fmtDate(c.created_at),
          c.created_by ?? "",
          fmtDate(c.updated_at),
          c.updated_by ?? "",
        ]),
    ],
  }));
}

export function instanceSheets(instances: DqControlInstance[], domains: DqDomain[]): XlsxSheet[] {
  const domainName = new Map(domains.map((d) => [d.id, d.name]));
  const domainOrder = new Map(domains.map((d) => [d.id, d.sort_order]));
  return DQ_CATEGORIES.map((cat) => ({
    name: DQ_CATEGORY_SHORT[cat.value],
    rows: [
      [
        "Dominio", "Controllo", "Dimensione", "ID SODA", "Tabella", "Campo", "Owner", "Rischio", "Impatto",
        "Stato", "Link SODA", "Note", "Inserito il", "Inserito da", "Modificato il", "Modificato da",
      ],
      ...instances
        .filter((i) => i.catalog_control?.category === cat.value)
        .sort(
          (a, b) =>
            (domainOrder.get(a.domain_id) ?? 0) - (domainOrder.get(b.domain_id) ?? 0) ||
            (a.catalog_control?.name ?? "").localeCompare(b.catalog_control?.name ?? "") ||
            a.table_ref.localeCompare(b.table_ref),
        )
        .map((i) => [
          domainName.get(i.domain_id) ?? "",
          i.catalog_control?.name ?? "",
          i.catalog_control?.dimension?.name ?? "",
          i.check_name ?? "",
          i.table_ref,
          i.field_ref,
          i.owner ?? "",
          i.risk,
          i.impact,
          STATUS_LABEL[i.status] ?? i.status,
          i.soda_url ?? "",
          i.notes ?? "",
          fmtDate(i.created_at),
          i.created_by ?? "",
          fmtDate(i.updated_at),
          i.updated_by ?? "",
        ]),
    ],
  }));
}

export function exportFileName(prefix: string, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${prefix}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.xlsx`;
}
