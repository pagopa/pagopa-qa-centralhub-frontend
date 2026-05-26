"use client";

import { useState } from "react";
import { useE2eSuites } from "@/hooks/useE2eSuites";

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="text-xl font-semibold text-text">Integrations</h1>
      <E2eSection />
    </div>
  );
}

function E2eSection() {
  const { data: suitesData, isLoading, refetch } = useE2eSuites();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplay, setNewDisplay] = useState("");
  const [newPath, setNewPath] = useState("");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[15px] text-text">E2E — GitHub</h2>
          <p className="text-[12px] text-text-muted mt-1">
            Token configurato via variabile d&apos;ambiente{" "}
            <code className="font-mono bg-subtle px-1 rounded">GITHUB_TOKEN</code>.
            Repository:{" "}
            <code className="font-mono bg-subtle px-1 rounded">
              pagopa/pagopa-platform-integration-test
            </code>
          </p>
        </div>
      </div>

      {/* Suites table */}
      <div className="rounded-[var(--radius)] border border-border overflow-hidden">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-subtle border-b border-border">
              <th className="text-left px-4 py-2 font-medium text-text-muted">Nome</th>
              <th className="text-left px-4 py-2 font-medium text-text-muted">Path</th>
              <th className="text-left px-4 py-2 font-medium text-text-muted">Ultimo sync</th>
              <th className="text-center px-4 py-2 font-medium text-text-muted">Abilitata</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-text-muted text-center">
                  Caricamento…
                </td>
              </tr>
            )}
            {suitesData?.map(({ suite }) => (
              <tr key={suite.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-semibold">{suite.display_name}</td>
                <td className="px-4 py-2 font-mono text-[12px] text-text-dim">
                  {suite.suite_path}
                </td>
                <td className="px-4 py-2 text-text-dim">
                  {suite.last_synced_at
                    ? new Date(suite.last_synced_at).toLocaleString("it-IT")
                    : "—"}
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className={
                      suite.enabled ? "text-success" : "text-text-muted"
                    }
                  >
                    {suite.enabled ? "✓" : "—"}
                  </span>
                </td>
              </tr>
            ))}
            {suitesData?.length === 0 && !isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-text-muted text-center">
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
            <label className="text-[11px] text-text-muted">Nome (es. wisp)</label>
            <input
              className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-2 py-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="wisp"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-text-muted">Display name</label>
            <input
              className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-2 py-1"
              value={newDisplay}
              onChange={(e) => setNewDisplay(e.target.value)}
              placeholder="WISP"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-text-muted">Suite path (es. wisp-tests)</label>
            <input
              className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-2 py-1"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="wisp-tests"
            />
          </div>
          <button
            className="rounded-[var(--radius-sm)] bg-accent text-accent-fg text-[13px] px-3 py-1"
            onClick={() => {
              // TODO Sprint S7: POST /api/v1/e2e/suites
              setAdding(false);
              setNewName("");
              setNewDisplay("");
              setNewPath("");
              refetch();
            }}
          >
            Salva
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
