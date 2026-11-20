"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { usePermissions } from "@/hooks/usePermissions";
import { useAddTlComment, useResolveTlComment, useTlComments } from "@/hooks/useTestLifecycle";
import { apiErrorMessage } from "@/lib/test-lifecycle";
import type { TlRevision } from "@/types/test-lifecycle";

const COMMENTABLE = ["draft", "in_review"];

/** "Review" tab: general and per-scenario comments of the shown revision. */
export function ReviewPanel({
  featureId,
  revision,
  selectedScenarioId,
  onSelectScenario,
  sessionReady,
}: {
  featureId: string;
  revision: TlRevision;
  selectedScenarioId: string | null;
  onSelectScenario: (id: string | null) => void;
  sessionReady: boolean;
}) {
  const { can } = usePermissions();
  const { data: comments = [], isLoading, isError } = useTlComments(featureId, revision.id);
  const add = useAddTlComment();
  const resolve = useResolveTlComment();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canWrite = can("edit:tl_feature") || can("review:tl_feature");
  const commentable = COMMENTABLE.includes(revision.status);
  const scenarios = [...revision.scenarios].sort((a, b) => a.position - b.position);
  const visible = selectedScenarioId ? comments.filter((c) => c.scenario_id === selectedScenarioId) : comments;

  const submit = async () => {
    const text = body.trim();
    if (!text || add.isPending) return;
    setError(null);
    try {
      await add.mutateAsync({ featureId, revisionId: revision.id, body: text, scenario_id: selectedScenarioId });
      setBody("");
    } catch (err) {
      setError(apiErrorMessage(err) ?? "Impossibile aggiungere il commento.");
    }
  };

  const toggle = async (id: string, resolved: boolean) => {
    setError(null);
    try {
      await resolve.mutateAsync({ commentId: id, resolved, featureId, revisionId: revision.id });
    } catch (err) {
      setError(apiErrorMessage(err) ?? "Impossibile aggiornare il commento.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-text-dim w-fit">
        Scenario
        <select
          className={SELECT_CLASS}
          value={selectedScenarioId ?? ""}
          onChange={(e) => {
            setError(null);
            onSelectScenario(e.target.value || null);
          }}
        >
          <option value="">Tutti / commento generale</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.tag} · {s.title}
            </option>
          ))}
        </select>
      </label>

      {isLoading && <p className="text-[13px] text-text-muted">Caricamento commenti…</p>}
      {isError && <p role="alert" className="text-danger text-[13px]">Commenti non disponibili.</p>}
      {!isLoading && !isError && visible.length === 0 && (
        <p className="text-[13px] text-text-muted">Nessun commento.</p>
      )}
      {visible.length > 0 && (
        <ul aria-label="Commenti" className="flex flex-col gap-2">
          {visible.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-3"
              style={c.resolved ? { opacity: 0.7 } : undefined}
            >
              <div className="flex items-center gap-2 flex-wrap text-[12px] text-text-muted">
                <span>{c.author}</span>
                <span>{new Date(c.created_at).toLocaleString("it-IT")}</span>
                <span className="font-mono">{c.scenario_tag ?? "Generale"}</span>
                {c.resolved && <span>Risolto</span>}
                {canWrite && commentable && (
                  <button
                    type="button"
                    className={`${SECONDARY_BUTTON_CLASS} ml-auto`}
                    disabled={!sessionReady || resolve.isPending}
                    onClick={() => void toggle(c.id, !c.resolved)}
                  >
                    {c.resolved ? <RotateCcw size={14} /> : <Check size={14} />}{" "}
                    {c.resolved ? "Riapri" : "Segna come risolto"}
                  </button>
                )}
              </div>
              <p className="text-[13px] whitespace-pre-wrap break-words">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="text-danger text-[13px]">{error}</p>}

      {!commentable ? (
        <p className="text-[13px] text-text-muted">
          Questa revisione non è in bozza né in review: non sono ammessi nuovi commenti.
        </p>
      ) : (
        canWrite && (
          <div className="flex flex-col gap-2">
            <textarea
              aria-label="Nuovo commento"
              className={INPUT_CLASS}
              rows={3}
              placeholder={selectedScenarioId ? "Commenta lo scenario selezionato" : "Commento generale"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} w-fit`}
              disabled={!sessionReady || add.isPending || !body.trim()}
              onClick={() => void submit()}
            >
              Aggiungi commento
            </button>
          </div>
        )
      )}
    </div>
  );
}
