"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, GripVertical, MessageSquare, MoveDown, MoveUp, Trash2 } from "lucide-react";
import { INPUT_CLASS, ROW_ICON_CLASS, SECONDARY_BUTTON_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { matchShortcut } from "@/lib/shortcuts";
import { useDraftSave } from "@/hooks/useDraftSave";
import { useLiveValidation } from "@/hooks/useLiveValidation";
import {
  ALLOWED_EXTRA_TAGS,
  isStaleLockError,
  safeHttpUrl,
  StaleDraftError,
  writeErrorMessage,
  type RegisterFlush,
} from "@/lib/test-lifecycle";
import type {
  TlExamples,
  TlPolarity,
  TlScenario,
  TlScenarioKind,
  TlScenarioUpdate,
} from "@/types/test-lifecycle";
import { EMPTY_EXAMPLES, ExamplesGrid } from "./ExamplesGrid";
import { useTlCategoryTags } from "@/hooks/useTestLifecycle";
import { ExtraTagsPicker } from "./ExtraTagsPicker";
import { StepsEditor } from "./StepsEditor";

export type ScenarioPatch = Omit<TlScenarioUpdate, "lock_version" | "position">;

/** The editable content of a scenario as currently typed (used to duplicate it). */
export interface ScenarioCopy {
  title: string;
  kind: TlScenarioKind;
  polarity: TlPolarity;
  extra_tags: string[];
  steps: string;
  examples: TlExamples | null;
  detail_link: string;
}

interface Draft {
  title: string;
  kind: TlScenarioKind;
  polarity: TlPolarity;
  extra_tags: string[];
  steps: string;
  examples: TlExamples | null;
  detail_link: string;
}

function toDraft(s: TlScenario): Draft {
  return {
    title: s.title,
    kind: s.kind,
    polarity: s.polarity,
    extra_tags: s.extra_tags,
    steps: s.steps,
    examples: s.examples,
    detail_link: s.detail_link ?? "",
  };
}

/** Fields of `next` that differ from the last saved draft, in API shape. */
function diff(saved: Draft, next: Draft): ScenarioPatch {
  const patch: ScenarioPatch = {};
  if (next.title !== saved.title) patch.title = next.title;
  if (next.kind !== saved.kind) patch.kind = next.kind;
  if (next.polarity !== saved.polarity) patch.polarity = next.polarity;
  if (next.extra_tags.join(",") !== saved.extra_tags.join(",")) patch.extra_tags = next.extra_tags;
  if (next.steps !== saved.steps) patch.steps = next.steps;
  const examples = next.kind === "outline" ? next.examples : null;
  if (JSON.stringify(examples) !== JSON.stringify(saved.kind === "outline" ? saved.examples : null)) {
    patch.examples = examples;
  }
  if (next.detail_link !== saved.detail_link) patch.detail_link = next.detail_link.trim() || null;
  return patch;
}

/**
 * One scenario of the working revision. Local text is the source of truth
 * while editing: it is seeded once from props (the page remounts the card on
 * reload) so a failed save never discards what the user typed. The stale-lock
 * banner is page-wide; here `stale` only suppresses further saves.
 */
export function ScenarioCard({
  scenario,
  readOnly,
  stale = false,
  onSave,
  onRemove,
  registerFlush,
  openComments = 0,
  onComment,
  collapsed = false,
  onToggleCollapsed,
  onDuplicate,
  onMove,
  canMoveUp = true,
  canMoveDown = true,
  dragHandleProps,
}: {
  scenario: TlScenario;
  readOnly: boolean;
  stale?: boolean;
  onSave: (patch: ScenarioPatch) => Promise<TlScenario | void>;
  onRemove?: () => Promise<unknown>;
  registerFlush?: RegisterFlush;
  /** Number of unresolved review comments on this scenario. */
  openComments?: number;
  /** Jumps to the Review tab with this scenario preselected. */
  onComment?: () => void;
  /** Only the header renders when collapsed; the draft stays in this component. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Called with the CURRENT draft (not the saved scenario). */
  onDuplicate?: (copy: ScenarioCopy) => Promise<unknown> | void;
  onMove?: (direction: "up" | "down") => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement> & { draggable?: boolean };
}) {
  const { errors, setErrors, validationError, schedule } = useLiveValidation(scenario.errors);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const { draft, setDraft, save, saving, error: saveError, setError: setSaveError } = useDraftSave<Draft, ScenarioPatch>({
    initial: toDraft(scenario),
    diff,
    persist: onSave,
    onSaved: (result) => {
      if (result) setErrors((result as TlScenario).errors);
    },
    disabled: readOnly || stale,
    registerFlush,
  });

  const update = (changes: Partial<Draft>, opts: { validate?: boolean; save?: boolean } = {}) => {
    const next = { ...draft, ...changes };
    setDraft(next);
    if (opts.validate) {
      schedule({ steps: next.steps, kind: next.kind, examples: next.kind === "outline" ? next.examples : null });
    }
    if (opts.save) void save();
  };

  const categoryTags = useTlCategoryTags();
  const toggleTag = (tag: string) => {
    const tags = draft.extra_tags.includes(tag)
      ? draft.extra_tags.filter((t) => t !== tag)
      : ALLOWED_EXTRA_TAGS.filter((t) => t === tag || draft.extra_tags.includes(t));
    update({ extra_tags: tags }, { save: true });
  };

  const duplicate = async () => {
    if (!onDuplicate || duplicating) return;
    setDuplicating(true);
    try {
      await onDuplicate({
        title: draft.title,
        kind: draft.kind,
        polarity: draft.polarity,
        extra_tags: draft.extra_tags,
        steps: draft.steps,
        examples: draft.kind === "outline" ? draft.examples : null,
        detail_link: draft.detail_link,
      });
    } catch (err) {
      if (!isStaleLockError(err) && !(err instanceof StaleDraftError)) setSaveError(writeErrorMessage(err));
    } finally {
      setDuplicating(false);
    }
  };

  // Link shown read-only: taken from the saved scenario, never from what is being typed.
  const detailUrl = safeHttpUrl(scenario.detail_link);

  return (
    <article
      id={`scenario-${scenario.id}`}
      data-scenario-id={scenario.id}
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 scroll-mt-4"
      onKeyDown={(e) => {
        if (readOnly || !onDuplicate || matchShortcut(e) !== "duplicate") return;
        e.preventDefault();
        void duplicate();
      }}
    >
      <header className="flex items-center gap-2 flex-wrap">
        {onToggleCollapsed && (
          <button
            type="button"
            className={ROW_ICON_CLASS}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? "Espandi" : "Comprimi"} scenario #${scenario.number}`}
            onClick={onToggleCollapsed}
          >
            {collapsed ? <ChevronRight size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </button>
        )}
        <span className="font-mono text-[12px] text-text-muted">#{scenario.number}</span>
        <span
          className="font-mono text-[12px] rounded-full px-2 py-0.5"
          style={{ background: "var(--neutral-soft)", color: "var(--text-dim)" }}
          title="Tag identità (non modificabile)"
        >
          {scenario.tag}
        </span>
        <span className="font-mono text-[12px] text-text-muted">@{draft.polarity}</span>
        {collapsed && <span className="text-[13px] text-text truncate min-w-0 flex-1">{draft.title}</span>}
        {errors.length > 0 && (
          <span
            className="font-mono text-[11px] rounded-full px-2 py-0.5"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            <span aria-hidden>{errors.length}</span>
            <span className="sr-only">{`${errors.length} errori`}</span>
          </span>
        )}
        {openComments > 0 && (
          <span
            className="text-[12px] rounded-full px-2 py-0.5"
            style={{ background: "var(--neutral-soft)", color: "var(--text-dim)" }}
            aria-label={`${openComments} commenti aperti`}
          >
            {openComments}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <span className="text-[12px] text-text-muted mr-1" aria-live="polite">
            {saving ? "Salvataggio…" : ""}
          </span>
          {onComment && (
            <button type="button" className={ROW_ICON_CLASS} aria-label="Commenta" title="Commenta" onClick={onComment}>
              <MessageSquare size={16} aria-hidden />
            </button>
          )}
          {!readOnly && dragHandleProps && (
            <button
              type="button"
              className={`${ROW_ICON_CLASS} cursor-grab`}
              aria-label="Trascina scenario"
              title="Trascina per riordinare"
              {...dragHandleProps}
            >
              <GripVertical size={16} aria-hidden />
            </button>
          )}
          {!readOnly && onMove && (
            <>
              <button
                type="button"
                className={`${ROW_ICON_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label="Sposta scenario in alto"
                title="Sposta in alto"
                disabled={stale || !canMoveUp}
                onClick={() => onMove("up")}
              >
                <MoveUp size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={`${ROW_ICON_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label="Sposta scenario in basso"
                title="Sposta in basso"
                disabled={stale || !canMoveDown}
                onClick={() => onMove("down")}
              >
                <MoveDown size={16} aria-hidden />
              </button>
            </>
          )}
          {!readOnly && onDuplicate && (
            <button
              type="button"
              className={`${ROW_ICON_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label="Duplica scenario"
              title="Duplica"
              disabled={stale || duplicating}
              onClick={() => void duplicate()}
            >
              <Copy size={16} aria-hidden />
            </button>
          )}
          {!readOnly &&
            onRemove &&
            (confirmRemove ? (
              <>
                <button
                  type="button"
                  className={SECONDARY_BUTTON_CLASS}
                  style={{ color: "var(--danger)" }}
                  onClick={() => {
                    setConfirmRemove(false);
                    onRemove().catch((err) => {
                      if (!isStaleLockError(err) && !(err instanceof StaleDraftError)) {
                        setSaveError(writeErrorMessage(err));
                      }
                    });
                  }}
                >
                  Conferma rimozione
                </button>
                <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setConfirmRemove(false)}>
                  Annulla
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`${ROW_ICON_CLASS} hover:!text-danger disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label="Rimuovi scenario"
                title="Rimuovi"
                disabled={stale}
                onClick={() => setConfirmRemove(true)}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            ))}
        </span>
      </header>

      {collapsed ? null : (
        <>
      <label className="flex flex-col gap-1 text-xs text-text-dim">
        Titolo scenario
        <input
          className={INPUT_CLASS}
          value={draft.title}
          readOnly={readOnly}
          onChange={(e) => update({ title: e.target.value })}
          onBlur={() => void save()}
        />
      </label>

      <div className="flex gap-3 flex-wrap items-end">
        <label className="flex flex-col gap-1 text-xs text-text-dim">
          Tipo
          <select
            className={SELECT_CLASS}
            value={draft.kind}
            disabled={readOnly}
            onChange={(e) => {
              const kind = e.target.value as TlScenarioKind;
              update(
                { kind, examples: kind === "outline" ? (draft.examples ?? EMPTY_EXAMPLES) : draft.examples },
                { validate: true, save: true },
              );
            }}
          >
            <option value="scenario">Scenario</option>
            <option value="outline">Schema dello scenario</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-dim">
          Polarità
          <select
            className={SELECT_CLASS}
            value={draft.polarity}
            disabled={readOnly}
            onChange={(e) => update({ polarity: e.target.value as TlPolarity }, { save: true })}
          >
            <option value="positivo">Positivo</option>
            <option value="negativo">Negativo</option>
          </select>
        </label>
        <ExtraTagsPicker value={draft.extra_tags} readOnly={readOnly} onToggle={toggleTag} options={categoryTags.data} />
      </div>

      <StepsEditor
        autocomplete
        value={draft.steps}
        readOnly={readOnly}
        errors={errors}
        notice={validationError}
        onChange={(steps) => update({ steps }, { validate: true })}
        onBlur={() => void save()}
      />

      {draft.kind === "outline" && (
        <ExamplesGrid
          value={draft.examples ?? EMPTY_EXAMPLES}
          readOnly={readOnly}
          onChange={(examples) => update({ examples }, { validate: true })}
          onBlur={() => void save()}
        />
      )}

      {readOnly ? (
        scenario.detail_link && (
          <p className="text-xs text-text-dim">
            Dettaglio:{" "}
            {detailUrl ? (
              <a href={detailUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                {scenario.detail_link}
              </a>
            ) : (
              <span>{scenario.detail_link}</span>
            )}
          </p>
        )
      ) : (
        <label className="flex flex-col gap-1 text-xs text-text-dim">
          Link di dettaglio
          <input
            className={INPUT_CLASS}
            value={draft.detail_link}
            onChange={(e) => update({ detail_link: e.target.value })}
            onBlur={() => void save()}
            placeholder="https://…"
          />
        </label>
      )}

      {saveError && (
        <p role="alert" className="text-danger text-[13px]">
          {saveError}
        </p>
      )}

      {!readOnly && (
        <footer className="flex items-center gap-2">
          <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={saving || stale} onClick={() => void save()}>
            Salva
          </button>
        </footer>
      )}
        </>
      )}
    </article>
  );
}
