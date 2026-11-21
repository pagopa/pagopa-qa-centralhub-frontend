"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { usePatchTlMigrationItem } from "@/hooks/useTestLifecycle";
import { useUsers } from "@/hooks/useUsers";
import { FEATURE_STATUS_LABEL, writeErrorMessage } from "@/lib/test-lifecycle";
import type { TlFeatureStatus, TlMigrationItem, TlMigrationOverrides } from "@/types/test-lifecycle";

const STATUSES: TlFeatureStatus[] = ["draft", "designed", "implemented"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-dim">
      {label}
      {children}
    </label>
  );
}

interface Form {
  scope_code: string;
  number: string;
  title: string;
  status: TlFeatureStatus;
  owner_id: string;
  reviewer_id: string;
  file_path: string;
}

/** Correzione di una riga: si inviano solo i campi cambiati, con la decisione. */
export function MigrationItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: TlMigrationItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const patch = usePatchTlMigrationItem();
  const { data: users } = useUsers();
  const eff = item.effective;
  const initial: Form = {
    scope_code: eff.scope_code ?? "",
    number: eff.number != null ? String(eff.number) : "",
    title: eff.title ?? "",
    status: eff.status,
    owner_id: eff.owner_id ?? "",
    reviewer_id: eff.reviewer_id ?? "",
    file_path: eff.file_path ?? "",
  };
  const [form, setForm] = useState<Form>(initial);
  const [error, setError] = useState<string | null>(null);
  const active = users?.items.filter((u) => u.is_active) ?? [];

  const changes = (): TlMigrationOverrides => {
    const out: TlMigrationOverrides = {};
    if (form.scope_code.trim() !== initial.scope_code) out.scope_code = form.scope_code.trim();
    if (form.number !== initial.number && form.number.trim()) out.number = Number(form.number);
    if (form.title.trim() !== initial.title && form.title.trim()) out.title = form.title.trim();
    if (form.status !== initial.status) out.status = form.status;
    if (form.owner_id !== initial.owner_id) out.owner_id = form.owner_id || null;
    if (form.reviewer_id !== initial.reviewer_id) out.reviewer_id = form.reviewer_id || null;
    if (form.file_path.trim() !== initial.file_path) out.file_path = form.file_path.trim() || null;
    return out;
  };

  const save = async (decision: "confirmed" | "excluded") => {
    setError(null);
    try {
      await patch.mutateAsync({ id: item.id, decision, overrides: decision === "excluded" ? {} : changes() });
      onOpenChange(false);
    } catch (err) {
      setError(writeErrorMessage(err));
    }
  };

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const userOptions = (
    <>
      <option value="">Nessuno</option>
      {active.map((u) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Correggi riga di migrazione</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ambito"><input className={INPUT_CLASS} value={form.scope_code} onChange={set("scope_code")} /></Field>
          <Field label="Numero">
            <input className={INPUT_CLASS} inputMode="numeric" value={form.number} onChange={set("number")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Titolo"><input className={INPUT_CLASS} value={form.title} onChange={set("title")} /></Field>
          </div>
          <Field label="Stato">
            <select className={SELECT_CLASS} value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{FEATURE_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="File">
            <input className={INPUT_CLASS} value={form.file_path} onChange={set("file_path")} placeholder="src/…/x.feature" />
          </Field>
          <Field label="Owner"><select className={SELECT_CLASS} value={form.owner_id} onChange={set("owner_id")}>{userOptions}</select></Field>
          <Field label="Reviewer"><select className={SELECT_CLASS} value={form.reviewer_id} onChange={set("reviewer_id")}>{userOptions}</select></Field>
        </div>
        {error && <p role="alert" className="text-danger text-[13px]">{error}</p>}
        <DialogFooter>
          <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={patch.isPending} onClick={() => void save("excluded")}>
            Escludi
          </button>
          <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={patch.isPending} onClick={() => void save("confirmed")}>
            Salva e conferma
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
