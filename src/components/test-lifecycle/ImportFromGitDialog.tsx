"use client";

import { useState } from "react";
import { GitBranch } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { useImportTlGit } from "@/hooks/useTestLifecycle";
import { apiErrorReasons, writeErrorMessage } from "@/lib/test-lifecycle";
import type { TlImportGitResult } from "@/types/test-lifecycle";

/**
 * "Importa da Git": sostituisce gli scenari della bozza con quelli di un feature file su GitHub
 * (qualsiasi branch). Le modifiche in sospeso vengono salvate prima, poi si usa il lock attuale.
 */
export function ImportFromGitDialog({
  featureId,
  revisionId,
  scenarioCount,
  currentLock,
  afterPendingWrites,
  onImported,
  disabled = false,
}: {
  featureId: string;
  revisionId: string;
  scenarioCount: number;
  currentLock: () => number;
  afterPendingWrites: <T>(fn: () => Promise<T>) => Promise<T>;
  onImported: () => void;
  disabled?: boolean;
}) {
  const importGit = useImportTlGit();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TlImportGitResult | null>(null);
  const needsConfirm = scenarioCount > 0;
  const canImport = !!url.trim() && (!needsConfirm || confirmed) && !importGit.isPending;

  const reset = () => {
    setUrl("");
    setConfirmed(false);
    setError(null);
    setResult(null);
  };

  const close = () => {
    const done = result !== null;
    setOpen(false);
    reset();
    if (done) onImported();
  };

  const submit = async () => {
    setError(null);
    try {
      const out = await afterPendingWrites(() =>
        importGit.mutateAsync({ featureId, revisionId, url: url.trim(), lockVersion: currentLock() }),
      );
      setResult(out);
    } catch (err) {
      const reasons = apiErrorReasons(err);
      setError(reasons.length ? `${writeErrorMessage(err)} ${reasons.join(" · ")}` : writeErrorMessage(err));
    }
  };

  const source = result?.feature.import_source;
  const imported = result?.feature.working_revision?.scenarios.length ?? 0;

  return (
    <>
      <button
        type="button"
        className={`${SECONDARY_BUTTON_CLASS} inline-flex items-center gap-1.5 w-fit`}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <GitBranch size={14} /> Importa da Git
      </button>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importa scenari da Git</DialogTitle>
          </DialogHeader>
          {result ? (
            <div className="flex flex-col gap-2 text-[13px] text-text">
              <p>
                {imported} scenari importati da <span className="font-mono">{source?.branch}</span>
                {result.replaced > 0 && <> (sostituiti {result.replaced} scenari esistenti)</>}.
              </p>
              {result.ignored_tags.length > 0 && (
                <p className="text-text-muted">
                  Tag non importati (non sono tag di categoria): {result.ignored_tags.map((t) => `@${t}`).join(", ")}
                </p>
              )}
              <p className="text-text-muted">
                All&apos;approvazione la PR dell&apos;hub scriverà il file in{" "}
                <span className="font-mono break-all">{source?.path}</span>
                {source?.branch && source.branch !== "main" && (
                  <> e una PR di pulizia lo toglierà dal branch <span className="font-mono">{source.branch}</span></>
                )}
                .
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-text-dim">
                Link al feature file su GitHub
                <input
                  className={INPUT_CLASS}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/…/blob/<branch>/…/file.feature"
                />
              </label>
              <p className="text-[12px] text-text-muted">
                Contesto, descrizione e scenari arrivano dal file; il titolo della feature resta questo. Gli scenari
                prendono i tag dell&apos;hub e i vecchi tag restano collegati allo storico NRT.
              </p>
              {needsConfirm && (
                <div className="flex flex-col gap-1 rounded-[var(--radius-sm)] px-3 py-2 text-[13px]" style={{ color: "var(--warning)", background: "var(--warning-soft)" }}>
                  <span>L&apos;importazione sostituisce i {scenarioCount} scenari della bozza.</span>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                    Ho capito, sostituiscili
                  </label>
                </div>
              )}
              {error && <p role="alert" className="text-danger text-[13px]">{error}</p>}
            </div>
          )}
          <DialogFooter>
            {result ? (
              <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={close}>Chiudi</button>
            ) : (
              <>
                <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={close}>Annulla</button>
                <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={!canImport} onClick={() => void submit()}>
                  {importGit.isPending ? "Importazione…" : "Importa"}
                </button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
