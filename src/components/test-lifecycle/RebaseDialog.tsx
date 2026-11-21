"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { useTlRebase } from "@/hooks/useTestLifecycle";
import { apiErrorCode, apiErrorMessage, lineDiff } from "@/lib/test-lifecycle";
import type { TlRebaseSide, TlRebaseView, TlScenarioContent } from "@/types/test-lifecycle";

const FIELD_LABEL: Record<string, string> = {
  title: "Titolo",
  description: "Descrizione",
  background: "Contesto",
};

interface Item {
  key: string;
  label: string;
  base: string;
  git: string;
  draft: string;
  conflict: boolean;
}

function contentText(c: TlScenarioContent | null): string {
  if (!c) return "";
  const lines = [`${c.kind === "outline" ? "Schema dello scenario" : "Scenario"}: ${c.title}`];
  const tags = [...c.extra_tags.map((t) => `@${t}`), `@${c.polarity}`];
  lines.push(tags.join(" "), c.steps);
  if (c.examples) {
    lines.push(`| ${c.examples.headers.join(" | ")} |`);
    for (const row of c.examples.rows) lines.push(`| ${row.join(" | ")} |`);
  }
  if (c.detail_link) lines.push(`#link:${c.detail_link}`);
  return lines.join("\n");
}

function items(view: TlRebaseView): Item[] {
  const meta = view.metadata.map((m) => ({
    key: m.field,
    label: FIELD_LABEL[m.field] ?? m.field,
    base: m.base ?? "",
    git: m.git ?? "",
    draft: m.draft ?? "",
    conflict: m.conflict,
  }));
  const scenarios = view.scenarios.map((s) => ({
    key: s.scenario_id,
    label: s.tag,
    base: contentText(s.base),
    git: contentText(s.git),
    draft: contentText(s.draft),
    conflict: s.conflict,
  }));
  return [...meta, ...scenarios];
}

/** What happens to a non-conflicting item when the rebase is applied. */
function autoOutcome(item: Item): string | null {
  if (item.git !== item.base && item.draft === item.base) return "Preso da Git";
  if (item.draft !== item.base && item.git === item.base) return "Resta la bozza";
  return null;
}

function DiffColumn({ title, base, text }: { title: string; base: string; text: string }) {
  const lines = lineDiff(base, text);
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] uppercase tracking-wide text-text-muted">{title}</span>
      <pre className="rounded-[var(--radius-sm)] border border-border bg-surface p-2 text-[12px] font-mono whitespace-pre-wrap break-words min-h-[2rem]">
        {lines.length === 0 ? (
          <span className="text-text-muted">(vuoto)</span>
        ) : (
          lines.map((l, i) => (
            <div
              key={i}
              style={
                l.type === "add"
                  ? { background: "var(--success-soft)" }
                  : l.type === "del"
                    ? { background: "var(--danger-soft)", textDecoration: "line-through" }
                    : undefined
              }
            >
              {l.text || " "}
            </div>
          ))
        )}
      </pre>
    </div>
  );
}

export function RebaseDialog({
  open,
  onOpenChange,
  featureId,
  revisionId,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureId: string;
  revisionId: string | undefined;
  /** Applies the choices (the page runs it after pending writes, with the current lock). */
  onApply: (choices: Record<string, TlRebaseSide>) => Promise<void>;
}) {
  const view = useTlRebase(featureId, revisionId, open);
  const [choices, setChoices] = useState<Record<string, TlRebaseSide>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const all = useMemo(() => (view.data ? items(view.data) : []), [view.data]);
  const changed = all.filter((i) => i.conflict || autoOutcome(i));
  const conflicts = all.filter((i) => i.conflict);
  const ready = conflicts.every((i) => choices[i.key]);
  const labelOf = (key: string) => all.find((i) => i.key === key)?.label ?? key;

  const apply = async () => {
    setError(null);
    setPending(true);
    try {
      await onApply(choices);
      setChoices({});
      onOpenChange(false);
    } catch (err) {
      if (apiErrorCode(err) === "rebase_required") {
        const detail = (err as { body?: { detail?: { conflicts?: unknown } } }).body?.detail;
        const keys = Array.isArray(detail?.conflicts) ? (detail.conflicts as string[]) : [];
        setError(`Scegli un lato per: ${keys.map(labelOf).join(", ")}`);
      } else {
        setError(apiErrorMessage(err) ?? "Riallineamento non riuscito.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Riallinea la bozza</DialogTitle>
        </DialogHeader>
        {view.isLoading ? (
          <p className="text-[13px] text-text-muted">Caricamento…</p>
        ) : view.isError ? (
          <p role="alert" className="text-[13px] text-text-muted">Impossibile caricare il confronto.</p>
        ) : (
          <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
            {changed.length === 0 && (
              <p className="text-[13px] text-text-muted">Nessuna differenza da riallineare.</p>
            )}
            {changed.map((item) => {
              const outcome = autoOutcome(item);
              return (
                <section key={item.key} className="flex flex-col gap-2 border-b border-border pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-[13px] text-text">{item.label}</span>
                    {item.conflict ? (
                      <div className="flex items-center gap-3 text-[13px]" role="radiogroup" aria-label={`Scelta per ${item.label}`}>
                        {(["git", "draft"] as TlRebaseSide[]).map((side) => (
                          <label key={side} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`choice-${item.key}`}
                              checked={choices[item.key] === side}
                              onChange={() => setChoices((prev) => ({ ...prev, [item.key]: side }))}
                              aria-label={`${side === "git" ? "Usa Git" : "Mantieni bozza"} per ${item.label}`}
                            />
                            {side === "git" ? "Usa Git" : "Mantieni bozza"}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[12px] text-text-muted">{outcome}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <DiffColumn title="Base" base={item.base} text={item.base} />
                    <DiffColumn title="Git" base={item.base} text={item.git} />
                    <DiffColumn title="Bozza" base={item.base} text={item.draft} />
                  </div>
                </section>
              );
            })}
          </div>
        )}
        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>{error}</p>
        )}
        <DialogFooter>
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => onOpenChange(false)}>
            Annulla
          </button>
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            disabled={!view.data || !ready || pending}
            onClick={() => void apply()}
          >
            Applica
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
