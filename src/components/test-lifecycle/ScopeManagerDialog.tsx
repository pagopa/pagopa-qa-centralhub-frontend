"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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
  SECONDARY_BUTTON_CLASS,
} from "@/components/ui/formStyles";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCreateTlScope, useTlScopes, useUpdateTlScope } from "@/hooks/useTestLifecycle";
import { apiErrorMessage } from "@/lib/test-lifecycle";
import type { TlScope } from "@/types/test-lifecycle";

const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]{1,19}$/;
const LOCKED_REASON = "Il codice non può cambiare: esistono già feature in questo ambito";

interface FormState {
  code: string;
  name: string;
  area: string;
  repo_folder: string;
  owner_team: string;
}

const EMPTY: FormState = { code: "", name: "", area: "", repo_folder: "", owner_team: "" };

function toForm(scope: TlScope): FormState {
  return {
    code: scope.code,
    name: scope.name,
    area: scope.area ?? "",
    repo_folder: scope.repo_folder ?? "",
    owner_team: scope.owner_team ?? "",
  };
}

const nullable = (v: string) => v.trim() || null;

export function ScopeManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: scopes, isLoading } = useTlScopes();
  const createScope = useCreateTlScope();
  const updateScope = useUpdateTlScope();

  // null = list view, "new" = create form, otherwise the edited scope.
  const [editing, setEditing] = useState<TlScope | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

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

  const errorText = mutation.error
    ? apiErrorMessage(mutation.error) ?? "Salvataggio non riuscito."
    : null;

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
                <span className="text-text-muted text-[12px]">{s.feature_count} feature</span>
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  className="text-text-muted hover:bg-hover rounded-[var(--radius-sm)] p-1"
                  aria-label={`Modifica ambito ${s.code}`}
                >
                  <Pencil size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-xs text-text-dim">
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
            <label className="flex flex-col gap-1 text-xs text-text-dim">
              Nome
              <input className={INPUT_CLASS} value={form.name} onChange={set("name")} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-dim">
              Area
              <input className={INPUT_CLASS} value={form.area} onChange={set("area")} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-dim">
              Cartella repository
              <input className={INPUT_CLASS} value={form.repo_folder} onChange={set("repo_folder")} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-dim">
              Team owner
              <input className={INPUT_CLASS} value={form.owner_team} onChange={set("owner_team")} />
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
