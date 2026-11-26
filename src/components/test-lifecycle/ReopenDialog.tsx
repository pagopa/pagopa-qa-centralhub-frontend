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
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";

/**
 * Riapri: a feature branch is opened for the changes. The name is proposed and can be changed;
 * leaving the proposal asks the backend for its default, a name that already exists is reused.
 */
export function ReopenDialog({
  open,
  defaultBranch,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  defaultBranch: string;
  busy: boolean;
  error: string | null;
  /** `undefined` when the proposed name was kept. */
  onConfirm: (branchName: string | undefined) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Remounted on every open so the field starts from the proposal. */}
        <ReopenForm
          key={String(open)}
          defaultBranch={defaultBranch}
          busy={busy}
          error={error}
          onConfirm={onConfirm}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReopenForm({
  defaultBranch,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  defaultBranch: string;
  busy: boolean;
  error: string | null;
  onConfirm: (branchName: string | undefined) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultBranch);
  const trimmed = name.trim();
  return (
    <>
      <DialogHeader>
        <DialogTitle>Riaprire la feature?</DialogTitle>
        <DialogDescription>
          Per accogliere le modifiche viene aperto un feature branch sul repository. Se un branch con quel nome
          esiste già viene riutilizzato così com&apos;è.
        </DialogDescription>
      </DialogHeader>
      <label className="flex flex-col gap-1 text-xs text-text-dim">
        Nome del branch
        <input
          className={`${INPUT_CLASS} font-mono text-[13px]`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
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
          disabled={busy || !trimmed}
          onClick={() => onConfirm(trimmed === defaultBranch ? undefined : trimmed)}
        >
          Riapri
        </button>
      </DialogFooter>
    </>
  );
}
