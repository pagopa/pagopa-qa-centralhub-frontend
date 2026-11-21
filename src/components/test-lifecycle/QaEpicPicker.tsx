"use client";

import { useEffect, useState } from "react";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { useCreateTlScopeEpic, useTlJiraEpics } from "@/hooks/useTestLifecycle";
import { apiErrorMessage } from "@/lib/test-lifecycle";

const DEBOUNCE_MS = 250;

/**
 * Epic QA dell'ambito: si scrive la chiave oppure si cerca per nome tra le Epic esistenti del
 * progetto QA. Con il campo vuoto e l'ambito già salvato, "Crea Epic QA" la crea su Jira.
 */
export function QaEpicPicker({
  value,
  onChange,
  scopeId,
  error,
}: {
  value: string;
  onChange: (key: string) => void;
  scopeId: string | null;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value);
  const [created, setCreated] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const createEpic = useCreateTlScopeEpic();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  const searchText = debounced.trim();
  const search = useTlJiraEpics(searchText, open && searchText.length >= 2);
  const results = open ? (search.data ?? []) : [];

  const create = async () => {
    if (!scopeId) return;
    setCreateError(null);
    try {
      const scope = await createEpic.mutateAsync({ scopeId });
      if (scope.jira_qa_epic_key) {
        onChange(scope.jira_qa_epic_key);
        setCreated(scope.jira_qa_epic_key);
      }
    } catch (err) {
      setCreateError(apiErrorMessage(err) ?? "Creazione dell'Epic non riuscita.");
    }
  };

  const message = error ?? createError;
  return (
    <div className="flex flex-col gap-1 text-xs text-text-dim">
      <label htmlFor="tl-scope-epic">Epic QA</label>
      <div className="relative flex gap-2">
        <input
          id="tl-scope-epic"
          className={`${INPUT_CLASS} w-full`}
          value={value}
          placeholder="Cerca per nome o scrivi la chiave (es. PQ-495)"
          autoComplete="off"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? "tl-scope-epic-error" : undefined}
          onChange={(e) => {
            setOpen(true);
            setCreated(null);
            onChange(e.target.value);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {!value.trim() && scopeId && (
          <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={createEpic.isPending} onClick={() => void create()}>
            Crea Epic QA
          </button>
        )}
        {results.length > 0 && (
          <ul
            role="listbox"
            aria-label="Epic QA trovate"
            className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-border bg-surface shadow"
          >
            {results.map((epic) => (
              <li key={epic.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={epic.key === value}
                  className="flex w-full gap-2 px-2 py-1.5 text-left text-[13px] hover:bg-hover"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(epic.key);
                    setOpen(false);
                  }}
                >
                  <span className="font-mono text-text">{epic.key}</span>
                  <span className="truncate text-text-dim">{epic.summary}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {open && search.isError && <span className="text-text-muted">Ricerca su Jira non disponibile: scrivi la chiave.</span>}
      {created && <span style={{ color: "var(--success)" }}>Epic {created} creata su Jira</span>}
      {message && (
        <span id="tl-scope-epic-error" className="text-danger">{message}</span>
      )}
    </div>
  );
}
