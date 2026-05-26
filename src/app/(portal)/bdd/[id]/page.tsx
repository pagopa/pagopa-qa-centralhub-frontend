"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, Trash2, Download, ChevronLeft } from "lucide-react";
import { useBddProject, useBddScenarios, useDeleteBddScenario, useUpdateBddScenario } from "@/hooks/useBdd";
import { GherkinEditor } from "@/components/bdd/GherkinEditor";
import type { BddScenario, BddStatus } from "@/types/index";

const STATUS_COLOR: Record<BddStatus, string> = {
  draft: "var(--text-muted)",
  reviewed: "var(--warning)",
  approved: "var(--success)",
};

const STATUS_LABEL: Record<BddStatus, string> = {
  draft: "Draft",
  reviewed: "Reviewed",
  approved: "Approved",
};

function ScenarioModal({ scenario, onClose }: { scenario: BddScenario; onClose: () => void }) {
  const updateScenario = useUpdateBddScenario();
  const [status, setStatus] = useState<BddStatus>(scenario.status as BddStatus);

  const handleStatusChange = async (newStatus: BddStatus) => {
    setStatus(newStatus);
    await updateScenario.mutateAsync({ id: scenario.id, status: newStatus });
  };

  const handleExport = () => {
    const blob = new Blob([scenario.gherkin], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${scenario.title.slice(0, 50).toLowerCase().replace(/\s+/g, "_")}.feature`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="rounded-[var(--radius)] border border-border bg-surface w-full max-w-2xl max-h-[80vh] overflow-y-auto flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-[14px] text-text">{scenario.title}</p>
            <p className="text-[11px] text-text-muted font-mono mt-0.5">{scenario.ai_provider} · {scenario.ai_model}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as BddStatus)}
              className="text-[12px] rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 outline-none text-text"
            >
              <option value="draft">Draft</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
            </select>
            <button onClick={handleExport} className="text-text-muted hover:text-accent transition-colors" title="Esporta .feature">
              <Download size={16} />
            </button>
            <button onClick={onClose} className="text-text-muted hover:text-text transition-colors text-lg leading-none">✕</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {(scenario.tags ?? []).map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-mono"
              style={{ background: "color-mix(in oklch, var(--warning) 15%, transparent)", color: "var(--warning)" }}>
              {tag}
            </span>
          ))}
        </div>

        <GherkinEditor value={scenario.gherkin} readOnly height={280} />
      </div>
    </div>
  );
}

export default function BddProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: projLoading } = useBddProject(id);
  const { data: scenarios, isLoading: scenLoading } = useBddScenarios(id);
  const deleteScenario = useDeleteBddScenario();

  const [selectedScenario, setSelectedScenario] = useState<BddScenario | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = scenarios?.filter((s) => statusFilter === "all" || s.status === statusFilter) ?? [];

  if (projLoading) return <p className="text-text-muted text-[13px]">Caricamento…</p>;
  if (!project) return <p className="text-danger text-[13px]">Progetto non trovato</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/bdd" className="text-text-muted hover:text-text transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-text">{project.name}</h1>
            {project.description && <p className="text-[13px] text-text-dim">{project.description}</p>}
          </div>
        </div>
        <Link
          href={`/bdd/${id}/new`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] font-medium no-underline transition-colors"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          <Plus size={14} />
          Nuovo scenario
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-1">
        {(["all", "draft", "reviewed", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className="px-3 py-1 text-[12px] rounded-[var(--radius-sm)] border transition-colors"
            style={{
              borderColor: statusFilter === f ? "var(--accent)" : "var(--border)",
              background: statusFilter === f ? "var(--accent-soft)" : "transparent",
              color: statusFilter === f ? "var(--accent)" : "var(--text-dim)",
            }}
          >
            {f === "all" ? "Tutti" : STATUS_LABEL[f as BddStatus]}
          </button>
        ))}
      </div>

      {scenLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento scenari…</p>
      ) : !filtered.length ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border p-8 text-center">
          <p className="text-text-dim text-[13px]">
            {statusFilter === "all" ? "Nessuno scenario ancora." : `Nessuno scenario con status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div className="rounded-[var(--radius)] border border-border overflow-hidden">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-subtle border-b border-border">
                {["Titolo", "Status", "Provider", "Tag", "Data", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-text-muted font-mono text-[11px] uppercase" style={{ letterSpacing: ".05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-subtle cursor-pointer" onClick={() => setSelectedScenario(s)}>
                  <td className="px-3 py-2 text-text font-medium">{s.title}</td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-[11px]" style={{ color: STATUS_COLOR[s.status as BddStatus] }}>
                      {STATUS_LABEL[s.status as BddStatus]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-muted font-mono text-[11px]">{s.ai_provider}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {(s.tags ?? []).slice(0, 3).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                          style={{ background: "color-mix(in oklch, var(--warning) 12%, transparent)", color: "var(--warning)" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-text-muted font-mono text-[11px] whitespace-nowrap">
                    {new Date(s.created_at).toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => deleteScenario.mutate(s.id)}
                      className="text-text-muted hover:text-danger transition-colors"
                      title="Elimina"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedScenario && (
        <ScenarioModal scenario={selectedScenario} onClose={() => setSelectedScenario(null)} />
      )}
    </div>
  );
}
