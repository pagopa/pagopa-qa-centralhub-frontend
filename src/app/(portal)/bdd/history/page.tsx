"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBddAllScenarios } from "@/hooks/useBdd";
import type { BddScenario, BddStatus } from "@/types/index";

const STATUS_COLOR: Record<BddStatus, string> = {
  draft: "var(--text-muted)",
  reviewed: "var(--warning)",
  approved: "var(--success)",
};

export default function BddHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBddAllScenarios(page, 20);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/bdd" className="text-text-muted hover:text-text transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-text">History scenari BDD</h1>
        <span className="text-[13px] text-text-muted font-mono">({total} totali)</span>
      </div>

      {isLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : !items.length ? (
        <p className="text-text-dim text-[13px]">Nessuno scenario ancora.</p>
      ) : (
        <>
          <div className="rounded-[var(--radius)] border border-border overflow-hidden">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-subtle border-b border-border">
                  {["Titolo", "Status", "Provider", "Sorgente", "Data"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 font-medium text-text-muted font-mono text-[11px] uppercase"
                      style={{ letterSpacing: ".05em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((s: BddScenario) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-subtle">
                    <td className="px-3 py-2 text-text">{s.title}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[11px]" style={{ color: STATUS_COLOR[s.status] }}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-muted font-mono text-[11px]">{s.ai_provider}</td>
                    <td className="px-3 py-2 text-text-muted font-mono text-[11px]">{s.source_type}</td>
                    <td className="px-3 py-2 text-text-muted font-mono text-[11px] whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="disabled:opacity-40 text-text-muted hover:text-text transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[12px] text-text-muted font-mono">{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="disabled:opacity-40 text-text-muted hover:text-text transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
