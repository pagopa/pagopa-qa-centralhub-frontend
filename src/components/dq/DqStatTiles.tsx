"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DqTileGroup } from "@/lib/dq-report";

/**
 * Collapsible "Riepilogo numeri" panel, closed by default.
 * The header shows the headline total; opened, each group is one compact row.
 */
export function DqStatTiles({
  groups,
  loading,
}: {
  groups: DqTileGroup[];
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((o) => !o);

  const headline = groups[0]?.tiles[0];

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-text-dim hover:bg-hover transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Riepilogo numeri
        {headline && (
          <span className="ml-auto font-normal text-text-muted">
            {headline.label}:{" "}
            <span className="font-semibold text-text tabular-nums">{loading ? "…" : headline.value}</span>
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border" aria-busy={loading || undefined}>
          {groups.map((group) => (
            <section key={group.title} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4">
              <h2
                className="text-[11px] font-mono uppercase text-text-muted md:w-56 md:shrink-0"
                style={{ letterSpacing: ".06em" }}
              >
                {group.title}
              </h2>
              <dl className="flex flex-wrap gap-x-5 gap-y-1.5">
                {group.tiles.map((tile, i) => (
                  <div key={tile.label} className="flex items-baseline gap-1.5">
                    <dt className="text-[12px] text-text-dim">{tile.label}</dt>
                    <dd
                      className="text-[14px] font-semibold tabular-nums"
                      style={{ color: i === 0 && group.tiles.length > 1 ? "var(--accent)" : "var(--text)" }}
                    >
                      {loading ? "…" : tile.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
