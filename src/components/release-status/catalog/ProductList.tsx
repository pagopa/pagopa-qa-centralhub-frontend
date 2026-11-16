import { Pencil, Plus, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Area, Product } from "@/types/release-status";

export const NOT_EMPTY_MESSAGE = "Il prodotto contiene ancora applicazioni";

const AREAS: { area: Area; label: string }[] = [
  { area: "CORE", label: "Core" },
  { area: "TOUCHPOINT", label: "TouchPoint" },
];

interface ProductListProps {
  products: Product[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductList({ products, selectedId, onSelect, onAdd, onEdit, onDelete }: ProductListProps) {
  const total = products.reduce((sum, p) => sum + p.application_count, 0);
  const iconButton =
    "inline-flex size-7 items-center justify-center rounded-md text-text-dim outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <nav aria-label="Prodotti" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Prodotti</h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-sm font-medium text-text hover:bg-hover"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nuovo prodotto
        </button>
      </div>

      <button
        type="button"
        aria-pressed={selectedId === null}
        onClick={() => onSelect(null)}
        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
          selectedId === null ? "bg-accent-soft font-medium text-accent" : "text-text hover:bg-hover"
        }`}
      >
        <span>Tutte le applicazioni</span>
        <span className="text-xs text-text-muted">{total}</span>
      </button>

      {AREAS.map(({ area, label }) => {
        const items = products.filter((p) => p.area === area).sort((a, b) => a.name.localeCompare(b.name, "it"));
        return (
          <section key={area} aria-label={`Area ${label}`} className="flex flex-col gap-1">
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</h3>
            {items.length === 0 && <p className="px-3 text-xs text-text-muted">Nessun prodotto</p>}
            {items.map((product) => {
              const blocked = product.application_count > 0;
              const hintId = `delete-hint-${product.id}`;
              const selected = selectedId === product.id;
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-1 rounded-md pr-1 ${selected ? "bg-accent-soft" : "hover:bg-hover"}`}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(product.id)}
                    className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      selected ? "font-medium text-accent" : "text-text"
                    }`}
                  >
                    <span className="truncate">{product.name}</span>
                    <span className="text-xs text-text-muted" aria-label={`${product.application_count} applicazioni`}>
                      {product.application_count}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    aria-label={`Modifica prodotto ${product.name}`}
                    onClick={() => onEdit(product)}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className={`${iconButton} ${blocked ? "cursor-not-allowed opacity-50" : ""}`}
                          aria-label={`Elimina prodotto ${product.name}`}
                          aria-disabled={blocked || undefined}
                          aria-describedby={blocked ? hintId : undefined}
                          onClick={() => !blocked && onDelete(product)}
                        />
                      }
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </TooltipTrigger>
                    {blocked && <TooltipContent>{NOT_EMPTY_MESSAGE}</TooltipContent>}
                  </Tooltip>
                  {blocked && (
                    <span id={hintId} className="sr-only">
                      {NOT_EMPTY_MESSAGE}
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </nav>
  );
}
