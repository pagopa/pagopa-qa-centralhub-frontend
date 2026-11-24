"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  ROW_ICON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/formStyles";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCreateTlScope, useTlScopes, useUpdateTlScope } from "@/hooks/useTestLifecycle";
import { apiErrorCode, apiErrorMessage } from "@/lib/test-lifecycle";
import { QaEpicPicker } from "./QaEpicPicker";
import type { TlScope } from "@/types/test-lifecycle";

const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]{1,19}$/;
const NOT_DELETABLE_HINT = "Ambito con feature pubblicate o PR aperte: non eliminabile";
const LOCKED_REASON = "Il codice non può cambiare: esistono già feature in questo ambito";

interface FormState {
  code: string;
  name: string;
  area: string;
  repo_folder: string;
  owner_team: string;
  jira_qa_epic_key: string;
  jira_component: string;
}

const EMPTY: FormState = {
  code: "", name: "", area: "", repo_folder: "", owner_team: "", jira_qa_epic_key: "", jira_component: "",
};

const EPIC_ERRORS = new Set(["jira_not_an_epic", "jira_issue_not_found"]);

function toForm(scope: TlScope): FormState {
  return {
    code: scope.code,
    name: scope.name,
    area: scope.area ?? "",
    repo_folder: scope.repo_folder ?? "",
    owner_team: scope.owner_team ?? "",
    jira_qa_epic_key: scope.jira_qa_epic_key ?? "",
    jira_component: scope.jira_component ?? "",
  };
}

const nullable = (v: string) => v.trim() || null;

export function ScopeManagerDialog({
  open,
  onOpenChange,
  onDeleteScope,
  initialEditScope,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, each scope row shows a delete icon; the caller owns the confirmation flow. */
  onDeleteScope?: (scope: TlScope) => void;
  /** Opens directly in edit mode for this scope (the caller remounts via `key` to change it). */
  initialEditScope?: TlScope;
}) {
  const { data: scopes, isLoading } = useTlScopes();
  const createScope = useCreateTlScope();
  const updateScope = useUpdateTlScope();

  // null = list view, "new" = create form, otherwise the edited scope.
  const [editing, setEditing] = useState<TlScope | "new" | null>(initialEditScope ?? null);
  const [form, setForm] = useState<FormState>(initialEditScope ? toForm(initialEditScope) : EMPTY);

  const mutation = editing === "new" ? createScope : updateScope;
  const isPending = mutation.isPending;
  const codeLocked = editing !== null && editing !== "new" && editing.feature_count > 0;
  const codeValid = CODE_PATTERN.test(form.code.trim());
  const canSubmit = !!form.name.trim() && (codeLocked || codeValid) && !isPending;

  const startEdit = (target: TlScope | "new") => {
    createScope.reset();
    updateScope.reset();
    setForm(target === "new" ? EMPTY : toForm(target));
    setEditing(target);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setEditing(null);
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (!canSubmit || editing === null) return;
    const done = { onSuccess: () => setEditing(null) };
    const common = {
      name: form.name.trim(),
      area: nullable(form.area),
      repo_folder: nullable(form.repo_folder),
      owner_team: nullable(form.owner_team),
      jira_qa_epic_key: nullable(form.jira_qa_epic_key)?.toUpperCase() ?? null,
      jira_component: nullable(form.jira_component),
    };
    if (editing === "new") {
      createScope.mutate({ code: form.code.trim(), ...common }, done);
    } else {
      updateScope.mutate(
        {
          id: editing.id,
          ...(codeLocked || form.code.trim() === editing.code ? {} : { code: form.code.trim() }),
          ...common,
        },
        done,
      );
    }
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const epicError =
    mutation.error && EPIC_ERRORS.has(apiErrorCode(mutation.error) ?? "")
      ? apiErrorMessage(mutation.error)
      : null;
  const errorText =
    mutation.error && !epicError ? apiErrorMessage(mutation.error) ?? "Salvataggio non riuscito." : null;

  const codeInput = (
    <input
      id="tl-scope-code"
      className={`${INPUT_CLASS} w-full`}
      value={form.code}
      onChange={set("code")}
      disabled={codeLocked}
      placeholder="Es. FdR3"
    />
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing === null ? "Gestisci ambiti" : editing === "new" ? "Nuovo ambito" : `Modifica ambito ${editing.code}`}
          </DialogTitle>
        </DialogHeader>

        {editing === null ? (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {isLoading && <p className="text-text-muted text-[13px]">Caricamento…</p>}
            {scopes?.length === 0 && <p className="text-text-muted text-[13px]">Nessun ambito definito</p>}
            {scopes?.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-[13px]">
                <span className="font-mono font-semibold w-24 shrink-0">{s.code}</span>
                <span className="flex-1 text-text-dim truncate">{s.name}</span>
                <span className="font-mono text-text-muted text-[12px]">{s.feature_count} feature</span>
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  className={ROW_ICON_CLASS}
                  aria-label={`Modifica ambito ${s.code}`}
                  title="Modifica"
                >
                  <Pencil size={16} aria-hidden />
                </button>
                {onDeleteScope && (
                  <button
                    type="button"
                    onClick={() => onDeleteScope(s)}
                    disabled={!s.deletable}
                    className={`${ROW_ICON_CLASS} hover:!text-danger disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:!text-text-muted`}
                    aria-label={`Elimina ambito ${s.code}`}
                    title={s.deletable ? "Elimina" : NOT_DELETABLE_HINT}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 font-mono text-[11px] uppercase text-text-muted">
              <label htmlFor="tl-scope-code">Codice</label>
              {codeLocked ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="block" tabIndex={0} />}>{codeInput}</TooltipTrigger>
                  <TooltipContent>{LOCKED_REASON}</TooltipContent>
                </Tooltip>
              ) : (
                codeInput
              )}
              {!codeLocked && form.code && !codeValid && (
                <span className="text-danger">2-20 caratteri alfanumerici, il primo è una lettera</span>
              )}
            </div>
            <label className="flex flex-col gap-1 font-mono text-[11px] uppercase text-text-muted">
              Nome
              <input className={INPUT_CLASS} value={form.name} onChange={set("name")} />
            </label>
            <label className="flex flex-col gap-1 font-mono text-[11px] uppercase text-text-muted">
              Area
              <input className={INPUT_CLASS} value={form.area} onChange={set("area")} />
            </label>
            <label className="flex flex-col gap-1 font-mono text-[11px] uppercase text-text-muted">
              Cartella repository
              <input className={INPUT_CLASS} value={form.repo_folder} onChange={set("repo_folder")} />
            </label>
            <label className="flex flex-col gap-1 font-mono text-[11px] uppercase text-text-muted">
              Team owner
              <input className={INPUT_CLASS} value={form.owner_team} onChange={set("owner_team")} />
            </label>
            <QaEpicPicker
              value={form.jira_qa_epic_key}
              onChange={(key) => setForm((prev) => ({ ...prev, jira_qa_epic_key: key }))}
              scopeId={editing === "new" ? null : editing.id}
              error={epicError}
            />
            <label className="flex flex-col gap-1 font-mono text-[11px] uppercase text-text-muted">
              Componente Jira
              <input className={INPUT_CLASS} value={form.jira_component} onChange={set("jira_component")} placeholder="Es. FDR" />
            </label>
            {errorText && (
              <p role="alert" className="text-danger text-[13px]">{errorText}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {editing === null ? (
            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => startEdit("new")}>
              Nuovo ambito
            </button>
          ) : (
            <>
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setEditing(null)}>
                Indietro
              </button>
              <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={!canSubmit} onClick={handleSubmit}>
                Salva
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
