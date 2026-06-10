// qa-hub-frontend/src/components/psp-fees/PspFeeTable.tsx
"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { PspFeeService } from "@/types/index";
import type { PspFeeChannelFilters, PspFeeFiltersState } from "@/components/psp-fees/PspFeeFilters";

interface PspFeeTableProps {
  items: PspFeeService[];
  filters: PspFeeFiltersState;
}

type SortColumn = "psp_rag_soc" | "importo_minimo" | "costo_fisso";
type SortDirection = "asc" | "desc";

const CHANNEL_BADGES: { key: keyof PspFeeChannelFilters; label: string }[] = [
  { key: "carte", label: "Carte" },
  { key: "conto", label: "Conto" },
  { key: "on_us", label: "On Us" },
  { key: "altri_wisp", label: "Altri WISP" },
  { key: "altri_io", label: "IO" },
  { key: "conto_app", label: "Conto App" },
  { key: "carte_app", label: "Carte App" },
];

function fmtAmount(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)}€`;
}

export function PspFeeTable({ items, filters }: PspFeeTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("psp_rag_soc");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const amount = filters.amount.trim() === "" ? null : Number(filters.amount);
    const activeChannels = (Object.keys(filters.channels) as (keyof PspFeeChannelFilters)[]).filter(
      (key) => filters.channels[key],
    );

    return items.filter((item) => {
      if (search) {
        const haystack = `${item.psp_rag_soc} ${item.nome_servizio}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (amount !== null && !Number.isNaN(amount)) {
        if (item.importo_minimo === null || item.importo_massimo === null) return false;
        if (amount < item.importo_minimo || amount > item.importo_massimo) return false;
      }

      for (const key of activeChannels) {
        if (!item[key]) return false;
      }

      return true;
    });
  }, [items, filters]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortColumn === "psp_rag_soc") {
        cmp = a.psp_rag_soc.localeCompare(b.psp_rag_soc);
      } else {
        const av = a[sortColumn] ?? -Infinity;
        const bv = b[sortColumn] ?? -Infinity;
        cmp = av - bv;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortColumn, sortDirection]);

  return (
    <div className="rounded-[var(--radius)] border border-border overflow-hidden bg-surface">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border bg-subtle">
            <th className="w-8 px-2 py-2" />
            <th
              className="text-left px-4 py-2 font-medium text-text-muted cursor-pointer select-none"
              onClick={() => toggleSort("psp_rag_soc")}
            >
              PSP {sortColumn === "psp_rag_soc" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
            <th className="text-left px-4 py-2 font-medium text-text-muted">Servizio</th>
            <th className="text-left px-4 py-2 font-medium text-text-muted">Tipo</th>
            <th className="text-left px-4 py-2 font-medium text-text-muted">Canali</th>
            <th
              className="text-right px-4 py-2 font-medium text-text-muted cursor-pointer select-none"
              onClick={() => toggleSort("importo_minimo")}
            >
              Importo {sortColumn === "importo_minimo" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
            <th
              className="text-right px-4 py-2 font-medium text-text-muted cursor-pointer select-none"
              onClick={() => toggleSort("costo_fisso")}
            >
              Costo fisso {sortColumn === "costo_fisso" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center px-4 py-8 text-text-muted">
                Nessun servizio trovato
              </td>
            </tr>
          )}
          {sorted.map((item) => {
            const isExpanded = expanded.has(item.id);
            return (
              <Fragment key={item.id}>
                <tr
                  className="border-b border-border last:border-0 hover:bg-hover cursor-pointer transition-colors"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <td className="px-2 py-2 text-center text-text-muted">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  <td className="px-4 py-2 font-semibold">{item.psp_rag_soc}</td>
                  <td className="px-4 py-2">{item.nome_servizio}</td>
                  <td className="px-4 py-2 text-text-dim font-mono text-[12px]">{item.tipo_vers_cod}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {CHANNEL_BADGES.filter(({ key }) => item[key]).map(({ key, label }) => (
                        <span
                          key={key}
                          className="inline-flex items-center font-mono rounded-full"
                          style={{ fontSize: 11, padding: "2px 8px", color: "var(--accent)", background: "var(--accent-soft)" }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-text-dim">
                    {fmtAmount(item.importo_minimo)} – {fmtAmount(item.importo_massimo)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-success">
                    {fmtAmount(item.costo_fisso)}
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-border last:border-0 bg-subtle">
                    <td />
                    <td colSpan={6} className="px-4 py-3 text-[12px] text-text-dim">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <div><span className="text-text-muted">Codice ABI:</span> {item.codice_abi}</div>
                        <div><span className="text-text-muted">Duplicato:</span> {item.is_duplicated ? "Sì" : "No"}</div>
                        <div><span className="text-text-muted">Canale/mod. pag.:</span> {item.descrizione_canale_mod_pag}</div>
                        <div><span className="text-text-muted">Descrizione servizio:</span> {item.inf_desc_serv}</div>
                        <div>
                          <span className="text-text-muted">URL canale:</span>{" "}
                          {item.inf_url_canale ? (
                            <a href={item.inf_url_canale} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                              {item.inf_url_canale}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                        <div>
                          <span className="text-text-muted">Info PSP:</span>{" "}
                          {item.url_informazioni_psp ? (
                            <a href={item.url_informazioni_psp} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                              {item.url_informazioni_psp}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
