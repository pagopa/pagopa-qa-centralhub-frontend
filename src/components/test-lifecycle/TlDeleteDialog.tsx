"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { useTlDelete, useTlDeletePreview } from "@/hooks/useTestLifecycle";
import { apiErrorMessage } from "@/lib/test-lifecycle";
import type {
  TlDeleteBlocker,
  TlDeleteJiraIssue,
  TlDeleteKind,
  TlDeleteResult,
} from "@/types/test-lifecycle";

export interface TlDeleteTarget {
  kind: TlDeleteKind;
  id: string;
  /** Feature code or scope code shown in the title. */
  label: string;
}

const ROLE_LABEL: Record<TlDeleteJiraIssue["role"], string> = {
  design: "Progettazione",
  impl: "Implementazione",
  qa_epic: "Epic QA",
};

const BLOCKER_LABEL: Record<TlDeleteBlocker["reason"], string> = {
  published: "pubblicata su Git",
  pr_open: "PR aperta",
};

const SECTION_LABEL_CLASS = "font-mono text-[11px] uppercase font-medium text-text-muted";

function DeleteBody({
  target,
  onClose,
  onDeleted,
}: {
  target: TlDeleteTarget;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const preview = useTlDeletePreview(target.kind, target.id);
  const remove = useTlDelete(target.kind);
  // null = untouched: the preselection comes from the preview's default_selected flags.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TlDeleteResult | null>(null);

  const data = preview.data;
  const issues = data?.jira_issues ?? [];
  const checked =
    selected ?? new Set(issues.filter((i) => i.default_selected).map((i) => i.key));
  const previewError = preview.error
    ? (apiErrorMessage(preview.error) ?? "Impossibile caricare l'anteprima di eliminazione.")
    : null;
  const canDelete = !!data?.deletable && !remove.isPending && !result;

  const toggle = (key: string) => {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const finish = () => {
    onDeleted?.();
    onClose();
  };

  // Escape/overlay: never close mid-delete; after a completed delete always report it.
  const handleOpenChange = (open: boolean) => {
    if (open || remove.isPending) return;
    if (result) finish();
    else onClose();
  };

  const confirm = async () => {
    setError(null);
    const keys = issues.filter((i) => checked.has(i.key)).map((i) => i.key);
    try {
      const res = await remove.mutateAsync({ id: target.id, deleteJiraKeys: keys });
      if (res.jira_results.some((r) => r.status === "failed")) setResult(res);
      else finish();
    } catch (err) {
      setError(apiErrorMessage(err) ?? "Eliminazione non riuscita.");
    }
  };

  const failed = result?.jira_results.filter((r) => r.status === "failed") ?? [];

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {target.kind === "feature" ? "Elimina feature" : "Elimina ambito"} {target.label}
        </DialogTitle>
        <DialogDescription>
          {target.kind === "feature"
            ? "La feature, le sue revisioni e i suoi scenari verranno eliminati definitivamente."
            : "L'ambito e tutte le sue feature verranno eliminati definitivamente."}
        </DialogDescription>
      </DialogHeader>

      {preview.isLoading && <p className="text-text-muted text-[13px]">Caricamento…</p>}
      {previewError && (
        <p role="alert" className="text-danger text-[13px]">{previewError}</p>
      )}

      {data && !result && (
        <div className="flex flex-col gap-4">
          <p className="font-mono text-[12px] text-text-dim">
            {data.features.length} feature · {data.scenario_count} scenari
          </p>

          {data.blockers.length > 0 && (
            <div className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-danger/30 bg-danger-soft p-3">
              <span className={SECTION_LABEL_CLASS}>Non eliminabile</span>
              <ul className="list-disc pl-5 text-[13px] text-danger">
                {data.blockers.map((b) => (
                  <li key={`${b.feature_id}-${b.reason}`}>
                    <span className="font-mono">{b.code}</span> — {BLOCKER_LABEL[b.reason]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {issues.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className={SECTION_LABEL_CLASS}>Issue Jira collegate</span>
                <div className="flex items-center gap-2 text-[12px]">
                  <button
                    type="button"
                    className="text-accent hover:underline"
                    onClick={() => setSelected(new Set(issues.map((i) => i.key)))}
                  >
                    Seleziona tutte
                  </button>
                  <button
                    type="button"
                    className="text-accent hover:underline"
                    onClick={() => setSelected(new Set())}
                  >
                    Nessuna
                  </button>
                </div>
              </div>
              <p className="text-[12px] text-text-muted">
                Le issue selezionate verranno eliminate anche su Jira; le altre restano invariate.
              </p>
              <ul className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                {issues.map((issue) => (
                  <li key={issue.key}>
                    <label className="flex items-start gap-2 text-[13px] cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 accent-[var(--accent)]"
                        checked={checked.has(issue.key)}
                        onChange={() => toggle(issue.key)}
                        aria-label={`${issue.key} ${issue.summary ?? ""}`.trim()}
                      />
                      <span className="flex flex-col min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          {issue.url ? (
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-accent hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {issue.key}
                            </a>
                          ) : (
                            <span className="font-mono">{issue.key}</span>
                          )}
                          <span className="font-mono text-[11px] uppercase text-text-muted">
                            {ROLE_LABEL[issue.role]}
                            {issue.feature_code ? ` · ${issue.feature_code}` : ""}
                          </span>
                          {issue.status && (
                            <span className="text-[11px] text-text-muted">{issue.status}</span>
                          )}
                        </span>
                        {issue.summary && <span className="text-text-dim truncate">{issue.summary}</span>}
                        {issue.role === "qa_epic" && (
                          <span className="text-[12px] text-text-muted">
                            L&apos;Epic può essere condivisa con altro lavoro, per questo non è preselezionata.
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-text">
            Eliminazione completata, ma alcune issue Jira non sono state eliminate. Puoi cancellarle a mano su Jira:
          </p>
          <ul className="list-disc pl-5 text-[13px] text-danger">
            {failed.map((r) => (
              <li key={r.key}>
                <span className="font-mono">{r.key}</span> — {r.reason ?? "errore sconosciuto"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="text-danger text-[13px]">{error}</p>
      )}

      <DialogFooter>
        {result ? (
          <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={finish}>
            Chiudi
          </button>
        ) : (
          <>
            <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={remove.isPending} onClick={onClose}>
              Annulla
            </button>
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} !bg-danger`}
              disabled={!canDelete}
              onClick={() => void confirm()}
            >
              Elimina
            </button>
          </>
        )}
      </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TlDeleteDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: TlDeleteTarget | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  if (!target) return null;
  return (
    <DeleteBody
      key={`${target.kind}:${target.id}`}
      target={target}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  );
}
