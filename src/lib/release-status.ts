import type {
  Area,
  AreaGroup,
  Cell,
  StatusFilter,
  SyncStatus,
  Target,
} from "@/types/release-status";

const FLAG_BY_FILTER: Record<Exclude<StatusFilter, "all">, string> = {
  drift: "DRIFT",
  unreachable: "UNREACHABLE",
  untested: "UNTESTED",
};

export function filterApplications(
  groups: AreaGroup[],
  area: Area,
  query: string,
  filter: StatusFilter,
): AreaGroup[] {
  const needle = query.trim().toLowerCase();
  const flag = filter === "all" ? null : FLAG_BY_FILTER[filter];

  return groups
    .filter((group) => group.area === area)
    .map((group) => ({
      ...group,
      products: group.products
        .map((product) => ({
          ...product,
          applications: product.applications.filter((app) => {
            if (flag && !app.flags.includes(flag as (typeof app.flags)[number])) return false;
            if (!needle) return true;
            return [app.name, product.name, app.repository, app.product_key].some((field) =>
              field.toLowerCase().includes(needle),
            );
          }),
        }))
        .filter((product) => product.applications.length > 0),
    }));
}

export type CellIcon = "loading" | "ok" | "error" | "warning" | "info";

export interface CellVisual {
  icon: CellIcon;
  drift: "equal" | "behind" | "ahead" | null;
  muted: boolean;
  tooltip: string;
}

const SEMVER = /^v?\d+\.\d+\.\d+/;

export function cellVisual(cell: Cell | null, target: Target): CellVisual {
  if (cell === null) {
    return { icon: "loading", drift: null, muted: false, tooltip: `${target}: in attesa del primo controllo` };
  }

  switch (cell.read_status) {
    case "ERROR": {
      const last = cell.version ? ` Ultima versione nota: ${cell.version}.` : "";
      const detail = cell.error_detail ? ` (${cell.error_detail})` : "";
      return {
        icon: "error",
        drift: null,
        muted: true,
        tooltip: `${target} non raggiungibile${detail}.${last}`.trim(),
      };
    }
    case "EMPTY_BODY":
      return { icon: "warning", drift: null, muted: false, tooltip: `${target}: risposta vuota` };
    case "NO_VERSION":
      return { icon: "warning", drift: null, muted: false, tooltip: `${target}: versione assente nella risposta` };
    case "NO_RELEASE":
      return { icon: "warning", drift: null, muted: false, tooltip: `${target}: nessuna release trovata` };
    default:
      break;
  }

  const version = cell.version ?? "";
  if (!SEMVER.test(version)) {
    return { icon: "info", drift: null, muted: false, tooltip: `${target}: ${version || "versione sconosciuta"}` };
  }

  const drift =
    cell.drift === "EQUAL" ? "equal" : cell.drift === "BEHIND" ? "behind" : cell.drift === "AHEAD" ? "ahead" : null;
  return { icon: "ok", drift, muted: false, tooltip: `${target}: ${version}` };
}

const STALE_AFTER_MS = 45 * 60 * 1000;

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function syncLabel(sync: SyncStatus | null, now: Date): { text: string; stale: boolean } {
  if (!sync) return { text: "Mai sincronizzato", stale: true };
  // A QUEUED/RUNNING row that is no longer in progress (dead worker) falls back to the last success.
  if (sync.in_progress) {
    const text = sync.status === "QUEUED" ? "Sincronizzazione in coda…" : "Sincronizzazione in corso…";
    return { text, stale: false };
  }

  const lastSuccess = sync.last_success_at ? new Date(sync.last_success_at) : null;
  const stale =
    sync.status === "FAILED" || !lastSuccess || now.getTime() - lastSuccess.getTime() > STALE_AFTER_MS;

  if (!lastSuccess) return { text: "Nessun aggiornamento riuscito", stale };

  const origin =
    sync.trigger === "MANUAL" ? `manuale${sync.requested_by ? ` (${sync.requested_by})` : ""}` : "automatico";
  return { text: `Ultimo aggiornamento ${hhmm(lastSuccess)} · ${origin}`, stale };
}

export interface FilterState {
  area: Area;
  q: string;
  filter: StatusFilter;
}

const FILTERS: readonly StatusFilter[] = ["all", "drift", "unreachable", "untested"];

export function parseFilterParams(params: URLSearchParams): FilterState {
  const area = params.get("area") === "TOUCHPOINT" ? "TOUCHPOINT" : "CORE";
  const rawFilter = params.get("filter") as StatusFilter | null;
  const filter = rawFilter && FILTERS.includes(rawFilter) ? rawFilter : "all";
  return { area, q: params.get("q") ?? "", filter };
}

export function filterParams(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.area !== "CORE") params.set("area", state.area);
  if (state.q) params.set("q", state.q);
  if (state.filter !== "all") params.set("filter", state.filter);
  return params;
}
