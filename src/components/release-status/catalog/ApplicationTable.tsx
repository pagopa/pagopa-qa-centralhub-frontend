import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Chip } from "@/components/primitives/Chip";
import { INPUT_CLASS } from "@/components/ui/formStyles";
import { ACCENT_LINK_CLASS, RuntimeChips, repoUrl } from "@/components/release-status/shared";
import type { Application } from "@/types/release-status";

interface ApplicationTableProps {
  applications: Application[];
  productNames: Record<string, string>;
  /** Ids of the hidden products: their applications are hidden too. */
  hiddenProductIds?: ReadonlySet<string>;
  query: string;
  onQueryChange: (q: string) => void;
  canAdd: boolean;
  onAdd: () => void;
  onOpen: (app: Application) => void;
  onEdit: (app: Application) => void;
  onDelete: (app: Application) => void;
}

export function ApplicationTable({
  applications,
  productNames,
  hiddenProductIds,
  query,
  onQueryChange,
  canAdd,
  onAdd,
  onOpen,
  onEdit,
  onDelete,
}: ApplicationTableProps) {
  const q = query.trim().toLowerCase();
  const rows = applications
    .filter(
      (a) =>
        !q ||
        [a.name, a.product_key, a.repository, a.test_object ?? ""].some((value) => value.toLowerCase().includes(q)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
  const iconButton =
    "inline-flex size-7 items-center justify-center rounded-md text-text-dim outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">Applicazioni</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 size-4 text-text-muted" aria-hidden="true" />
            <input
              type="search"
              aria-label="Cerca applicazione"
              placeholder="Nome, chiave, repository…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className={`${INPUT_CLASS} w-64 pl-8`}
            />
          </label>
          <button
            type="button"
            onClick={onAdd}
            disabled={!canAdd}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm font-medium text-text hover:bg-hover disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nuova applicazione
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p role="status" className="rounded-[var(--radius)] border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-text-muted">
          Nessuna applicazione
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="px-3 py-2 font-medium">Applicazione</th>
                <th className="px-3 py-2 font-medium">Prodotto</th>
                <th className="px-3 py-2 font-medium">Repository</th>
                <th className="px-3 py-2 font-medium">Runtime</th>
                <th className="px-3 py-2 font-medium">Test object</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Azioni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((app) => (
                <tr key={app.id} className="border-t border-border first:border-t-0">
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-text">{app.name}</span>
                      {app.hidden ? (
                        <Chip variant="status" value="skipped" label="nascosta" />
                      ) : (
                        hiddenProductIds?.has(app.product_id) && (
                          <Chip variant="status" value="skipped" label="nascosta (prodotto)" />
                        )
                      )}
                    </div>
                    <div className="text-xs text-text-muted">{app.product_key}</div>
                  </td>
                  <td className="px-3 py-2 text-text-muted">{productNames[app.product_id] ?? "—"}</td>
                  <td className="px-3 py-2">
                    <a href={repoUrl(app.repository)} target="_blank" rel="noreferrer" className={ACCENT_LINK_CLASS}>
                      {app.repository}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1">
                      <RuntimeChips app={app} />
                      <Chip variant="status" value="skipped" label={app.kind} />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-muted">{app.test_object ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button type="button" className={iconButton} aria-label={`Dettaglio di ${app.name}`} onClick={() => onOpen(app)}>
                        <Eye className="size-3.5" aria-hidden="true" />
                      </button>
                      <button type="button" className={iconButton} aria-label={`Modifica ${app.name}`} onClick={() => onEdit(app)}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <button type="button" className={iconButton} aria-label={`Elimina ${app.name}`} onClick={() => onDelete(app)}>
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
