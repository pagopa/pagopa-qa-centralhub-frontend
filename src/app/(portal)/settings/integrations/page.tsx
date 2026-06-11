"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useE2eSuites } from "@/hooks/useE2eSuites";
import type { E2eSuite } from "@/types/index";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function IntegrationsPage() {
  return (
    <RouteGuard action="manage:integrations">
      <div className="flex flex-col gap-8 max-w-4xl">
        <h1 className="text-xl font-semibold text-text">Integrations</h1>
        <E2eSection />
      </div>
    </RouteGuard>
  );
}

interface EditState {
  display_name: string;
  suite_path: string;
  github_repo: string;
  enabled: boolean;
  sync_lookback_days: string;
}

function toEditState(suite: E2eSuite): EditState {
  return {
    display_name: suite.display_name,
    suite_path: suite.suite_path,
    github_repo: suite.github_repo,
    enabled: suite.enabled,
    sync_lookback_days: suite.sync_lookback_days != null ? String(suite.sync_lookback_days) : "",
  };
}

function E2eSection() {
  const { data: suitesData, isLoading } = useE2eSuites();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const [adding, setAdding] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplay, setNewDisplay] = useState("");
  const [newPath, setNewPath] = useState("");
  const [newRepo, setNewRepo] = useState("pagopa/pagopa-platform-integration-test");
  const [newLookback, setNewLookback] = useState("");

  function startEdit(suite: E2eSuite) {
    setEditingId(suite.id);
    setEditState(toEditState(suite));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  async function handleUpdate(suiteId: string) {
    if (!editState || saving) return;
    setSaving(true);
    try {
      await apiClient(`/api/v1/e2e/suites/${suiteId}`, {
        method: "PATCH",
        body: JSON.stringify({
          display_name: editState.display_name,
          suite_path: editState.suite_path,
          github_repo: editState.github_repo,
          enabled: editState.enabled,
          sync_lookback_days: editState.sync_lookback_days ? parseInt(editState.sync_lookback_days, 10) : null,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["e2e"] });
      setEditingId(null);
      setEditState(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!newName || !newDisplay || !newPath || addSaving) return;
    setAddSaving(true);
    try {
      await apiClient("/api/v1/e2e/suites", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          display_name: newDisplay,
          suite_path: newPath,
          github_repo: newRepo,
          enabled: true,
          sync_lookback_days: newLookback ? parseInt(newLookback, 10) : null,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["e2e"] });
      setAdding(false);
      setNewName("");
      setNewDisplay("");
      setNewPath("");
      setNewRepo("pagopa/pagopa-platform-integration-test");
      setNewLookback("");
    } finally {
      setAddSaving(false);
    }
  }

  const inputCls = "rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-2 py-1";

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-[15px] text-text">E2E — GitHub</h2>
        <p className="text-[12px] text-text-muted mt-1">
          Token configurato via variabile d&apos;ambiente{" "}
          <code className="font-mono bg-subtle px-1 rounded">GITHUB_TOKEN</code>.
        </p>
      </div>

      {/* Suites table */}
      <div className="rounded-[var(--radius)] border border-border overflow-hidden">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-subtle border-b border-border">
              <th className="text-left px-3 py-2 font-medium text-text-muted">Nome</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted">Display</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted">Suite path</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted">Repo</th>
              <th className="text-center px-3 py-2 font-medium text-text-muted">Lookback</th>
              <th className="text-center px-3 py-2 font-medium text-text-muted">Abilitata</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted">Ultimo sync</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-text-muted text-center">
                  Caricamento…
                </td>
              </tr>
            )}
            {suitesData?.map(({ suite }) => {
              const isEditing = editingId === suite.id;
              return (
                <tr key={suite.id} className="border-b border-border last:border-0">
                  {/* name — never editable (slug) */}
                  <td className="px-3 py-2 font-mono text-[12px] text-text-dim">{suite.name}</td>

                  {isEditing && editState ? (
                    <>
                      <td className="px-3 py-1">
                        <input className={inputCls} value={editState.display_name}
                          onChange={(e) => setEditState({ ...editState, display_name: e.target.value })} />
                      </td>
                      <td className="px-3 py-1">
                        <input className={`${inputCls} w-32`} value={editState.suite_path}
                          onChange={(e) => setEditState({ ...editState, suite_path: e.target.value })} />
                      </td>
                      <td className="px-3 py-1">
                        <input className={`${inputCls} w-52`} value={editState.github_repo}
                          onChange={(e) => setEditState({ ...editState, github_repo: e.target.value })} />
                      </td>
                      <td className="px-3 py-1 text-center">
                        <input type="number" min={1} className={`${inputCls} w-20`}
                          value={editState.sync_lookback_days}
                          onChange={(e) => setEditState({ ...editState, sync_lookback_days: e.target.value })}
                          placeholder="∞" />
                      </td>
                      <td className="px-3 py-1 text-center">
                        <input type="checkbox" checked={editState.enabled}
                          onChange={(e) => setEditState({ ...editState, enabled: e.target.checked })} />
                      </td>
                      <td className="px-3 py-2 text-text-dim">
                        {suite.last_synced_at ? new Date(suite.last_synced_at).toLocaleString("it-IT") : "—"}
                      </td>
                      <td className="px-3 py-1 whitespace-nowrap">
                        <button
                          className="rounded-[var(--radius-sm)] bg-accent text-accent-fg text-[12px] px-2 py-1 disabled:opacity-50"
                          disabled={saving}
                          onClick={() => handleUpdate(suite.id)}
                        >
                          {saving ? "…" : "Salva"}
                        </button>
                        <button
                          className="rounded-[var(--radius-sm)] border border-border text-[12px] px-2 py-1"
                          onClick={cancelEdit}
                        >
                          Annulla
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-semibold">{suite.display_name}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-text-dim">{suite.suite_path}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-text-dim">{suite.github_repo}</td>
                      <td className="px-3 py-2 text-center font-mono text-[12px] text-text-dim">
                        {suite.sync_lookback_days != null ? `${suite.sync_lookback_days}g` : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={suite.enabled ? "text-success" : "text-text-muted"}>
                          {suite.enabled ? "✓" : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-dim">
                        {suite.last_synced_at ? new Date(suite.last_synced_at).toLocaleString("it-IT") : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className="rounded-[var(--radius-sm)] border border-border text-[12px] px-2 py-1 hover:bg-hover transition-colors"
                          onClick={() => startEdit(suite)}
                        >
                          Modifica
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {suitesData?.length === 0 && !isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-text-muted text-center">
                  Nessuna suite configurata
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add suite form */}
      {adding ? (
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-text-muted">Nome slug</label>
            <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="fdr" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-text-muted">Display name</label>
            <input className={inputCls} value={newDisplay} onChange={(e) => setNewDisplay(e.target.value)} placeholder="FDR" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-text-muted">Suite path</label>
            <input className={inputCls} value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="fdr-tests" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-text-muted">GitHub repo</label>
            <input className={`${inputCls} w-64`} value={newRepo} onChange={(e) => setNewRepo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-text-muted">Lookback giorni (vuoto = tutti)</label>
            <input type="number" min={1} className={`${inputCls} w-28`} value={newLookback}
              onChange={(e) => setNewLookback(e.target.value)} placeholder="es. 90" />
          </div>
          <button
            className="rounded-[var(--radius-sm)] bg-accent text-accent-fg text-[13px] px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!newName || !newDisplay || !newPath || addSaving}
            onClick={handleAdd}
          >
            {addSaving ? "Salvataggio…" : "Salva"}
          </button>
          <button
            className="rounded-[var(--radius-sm)] border border-border text-[13px] px-3 py-1"
            onClick={() => setAdding(false)}
          >
            Annulla
          </button>
        </div>
      ) : (
        <button
          className="self-start rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-3 py-1 hover:bg-hover transition-colors"
          onClick={() => setAdding(true)}
        >
          + Aggiungi suite
        </button>
      )}
    </section>
  );
}
