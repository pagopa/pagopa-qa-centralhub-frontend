"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, FolderOpen } from "lucide-react";
import { useBddProjects, useCreateBddProject, useDeleteBddProject } from "@/hooks/useBdd";
import type { BddProject } from "@/types/index";

function ProjectCard({ project, onDelete }: { project: BddProject; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4 flex flex-col gap-3 hover:bg-hover transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/bdd/${project.id}`} className="no-underline flex-1">
          <p className="font-semibold text-[14px] text-text hover:text-accent transition-colors">{project.name}</p>
          {project.description && (
            <p className="text-[12px] text-text-dim mt-0.5 line-clamp-2">{project.description}</p>
          )}
        </Link>
        <button
          onClick={() => onDelete(project.id)}
          className="text-text-muted hover:text-danger transition-colors shrink-0"
          title="Elimina progetto"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted font-mono">
          {project.scenario_count} scenar{project.scenario_count === 1 ? "io" : "i"}
        </span>
        <Link
          href={`/bdd/${project.id}`}
          className="flex items-center gap-1 text-[12px] font-medium no-underline"
          style={{ color: "var(--accent)" }}
        >
          <FolderOpen size={13} />
          Apri
        </Link>
      </div>
    </div>
  );
}

export default function BddProjectsPage() {
  const { data: projects, isLoading } = useBddProjects();
  const createProject = useCreateBddProject();
  const deleteProject = useDeleteBddProject();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createProject.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    setName("");
    setDescription("");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Eliminare il progetto e tutti i suoi scenari?")) {
      deleteProject.mutate(id);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">BDD Generator</h1>
          <p className="text-[13px] text-text-dim mt-0.5">Genera scenari Gherkin dai tuoi requisiti con AI</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/bdd/history"
            className="px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover transition-colors no-underline"
          >
            History
          </Link>
          <Link
            href="/bdd/settings"
            className="px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover transition-colors no-underline"
          >
            Settings
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] font-medium transition-colors"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <Plus size={14} />
            Nuovo progetto
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4 flex flex-col gap-3">
          <p className="font-semibold text-[13px] text-text">Nuovo progetto BDD</p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Nome progetto"
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none focus:border-[var(--accent)]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrizione (opzionale)"
            rows={2}
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-[13px] text-text outline-none focus:border-[var(--accent)] resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || createProject.isPending}
              className="px-3 py-1.5 text-[13px] rounded-[var(--radius-sm)] font-medium disabled:opacity-50 transition-colors"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {createProject.isPending ? "Creazione..." : "Crea"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : !projects?.length ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border p-12 text-center">
          <p className="text-text-dim text-[14px]">Nessun progetto BDD ancora.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-[13px] font-medium"
            style={{ color: "var(--accent)" }}
          >
            Crea il primo progetto →
          </button>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
