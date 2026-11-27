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
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { useMoveTlFeatures, useTlScopes } from "@/hooks/useTestLifecycle";
import { apiErrorBlocked, apiErrorMessage } from "@/lib/test-lifecycle";
import type { TlBlockedFeature, TlMoveResult } from "@/types/test-lifecycle";

interface Props {
  open: boolean;
  features: { id: string; code: string }[];
  /** Distinct scopes the features are in now: with a single one it is not offered as a target. */
  currentScopeIds: string[];
  onClose: () => void;
  /** The move happened and the dialog was closed: the page refreshes. */
  onMoved: () => void;
}

/**
 * Moves features to another scope. They take the code, number and scenario tags of the target
 * scope, which is only possible while they are not on the repository with the hub identifiers:
 * otherwise the move is refused with the list of the features that block it.
 */
export function MoveFeaturesDialog(props: Props) {
  // Remounted on every open so the choices start fresh.
  return <MoveDialog key={String(props.open)} {...props} />;
}

function MoveDialog({ open, features, currentScopeIds, onClose, onMoved }: Props) {
  const { data: scopes } = useTlScopes();
  const move = useMoveTlFeatures();
  const [targetId, setTargetId] = useState("");
  const [result, setResult] = useState<TlMoveResult | null>(null);
  const [blocked, setBlocked] = useState<TlBlockedFeature[]>([]);
  const [error, setError] = useState<string | null>(null);

  const targets = (scopes ?? []).filter((s) => !(currentScopeIds.length === 1 && s.id === currentScopeIds[0]));

  const run = async () => {
    setError(null);
    setBlocked([]);
    try {
      setResult(
        await move.mutateAsync({ featureIds: features.map((f) => f.id), targetScopeId: targetId }),
      );
    } catch (err) {
      const list = apiErrorBlocked(err);
      if (list.length > 0) setBlocked(list);
      else setError(apiErrorMessage(err) ?? "Spostamento non riuscito.");
    }
  };

  const finish = () => (result ? onMoved() : onClose());

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish()}>
      <DialogContent className="sm:max-w-lg">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Spostamento completato</DialogTitle>
              <DialogDescription>
                {result.moved.length} {result.moved.length === 1 ? "feature spostata" : "feature spostate"}
                {result.skipped.length > 0 ? `, ${result.skipped.length} già nell'ambito di arrivo` : ""}.
              </DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col gap-1 font-mono text-[12px] text-text">
              {result.moved.map((m) => (
                <li key={m.feature_id}>
                  {m.old_code === m.new_code ? m.new_code : `${m.old_code} → ${m.new_code}`}
                </li>
              ))}
            </ul>
            {result.alignment_error && (
              <p role="note" className="text-[13px]" style={{ color: "var(--warning-ink)" }}>
                Le PR di allineamento della migrazione non sono state aggiornate: {result.alignment_error}
              </p>
            )}
            <DialogFooter>
              <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={finish}>
                Chiudi
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Sposta in un altro ambito</DialogTitle>
              <DialogDescription>
                {features.length === 1 ? "Feature:" : `${features.length} feature:`}{" "}
                <span className="font-mono">{features.map((f) => f.code).join(", ")}</span>
              </DialogDescription>
            </DialogHeader>
            <label className="flex flex-col gap-1 text-xs text-text-dim">
              Ambito di arrivo
              <select className={SELECT_CLASS} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Seleziona un ambito…</option>
                {targets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[12px] text-text-dim">
              Le feature prendono codice, numero e tag degli scenari dell&apos;ambito di arrivo; i vecchi tag restano come alias, così lo storico NRT non si perde. Cambia anche l&apos;Epic QA dei futuri task Jira. I task Jira già creati non cambiano; il percorso del file resta quello attuale se la feature ce l&apos;ha già.
            </p>
            {blocked.length > 0 && (
              <div role="status" className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border bg-subtle p-2 text-[12px]">
                <p>Non si può spostare: queste feature sono già sul repository con i codici e i tag attuali, o hanno una PR o un branch di lavoro:</p>
                <ul aria-label="Feature che non si possono adeguare" className="flex flex-col gap-1">
                  {blocked.map((b) => (
                    <li key={b.feature_id}>
                      <span className="font-mono font-semibold">{b.code}</span>: {b.reasons.join(" ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && (
              <p role="alert" className="text-danger text-[13px]">
                {error}
              </p>
            )}
            <DialogFooter>
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onClose}>
                Annulla
              </button>
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASS}
                disabled={!targetId || move.isPending}
                onClick={() => void run()}
              >
                Sposta
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
