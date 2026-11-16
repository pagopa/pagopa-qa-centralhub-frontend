import { useId, useState } from "react";
import { ChevronDown, CloudOff, RefreshCwOff } from "lucide-react";
import { ApplicationRow, RELEASE_GRID } from "@/components/release-status/ApplicationRow";
import { GithubMark } from "@/components/release-status/GithubMark";
import type { ProductGroup as Product } from "@/types/release-status";

interface ProductGroupProps {
  product: Product;
  onOpen: (applicationId: string) => void;
}

/** Collapsible product section with a sticky header carrying counts and column titles. */
export function ProductGroup({ product, onOpen }: ProductGroupProps) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const drift = product.applications.filter((app) => app.flags.includes("DRIFT")).length;
  const unreachable = product.applications.filter((app) => app.flags.includes("UNREACHABLE")).length;

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface overflow-clip" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/85">
        <h2>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left outline-none transition-colors hover:bg-hover/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          >
            <ChevronDown
              className={`size-4 shrink-0 text-text-muted transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
              aria-hidden="true"
            />
            <span className="truncate text-sm font-semibold text-text">{product.name}</span>
            <span className="rounded-full bg-neutral-soft px-2 py-0.5 font-mono text-[11px] tabular-nums text-text-dim">
              {product.applications.length}
            </span>
            {drift > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 font-mono text-[11px] tabular-nums text-warning"
              >
                <RefreshCwOff className="size-3" aria-hidden="true" />
                {drift}
                <span className="sr-only"> con versioni diverse</span>
              </span>
            )}
            {unreachable > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 font-mono text-[11px] tabular-nums text-danger"
              >
                <CloudOff className="size-3" aria-hidden="true" />
                {unreachable}
                <span className="sr-only"> non raggiungibili</span>
              </span>
            )}
          </button>
        </h2>
        {open && (
          <div
            aria-hidden="true"
            className={`${RELEASE_GRID} hidden border-t border-border bg-subtle/60 px-4 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider text-text-muted sm:grid`}
          >
            <span>Applicazione</span>
            <span className="inline-flex items-center gap-1">
              <GithubMark className="size-3" /> Repo
            </span>
            <span>DEV</span>
            <span>UAT</span>
            <span>PROD</span>
          </div>
        )}
      </div>

      <div
        id={bodyId}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          {product.applications.map((app) => (
            <ApplicationRow key={app.id} application={app} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}
