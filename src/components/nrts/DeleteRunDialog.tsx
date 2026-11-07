"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";

interface DeleteRunDialogProps {
  /** Short description of the run to delete, e.g. "CHECKOUT del 2026-01-01 10:00:00". */
  runLabel: string | null;
  isDeleting: boolean;
  hasError: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks for confirmation before a Quality Gate run is permanently deleted. */
export function DeleteRunDialog({ runLabel, isDeleting, hasError, onConfirm, onCancel }: DeleteRunDialogProps) {
  return (
    <Dialog open={runLabel !== null} onOpenChange={(open) => { if (!open && !isDeleting) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminare la run?</DialogTitle>
          <DialogDescription>
            Stai per eliminare definitivamente la run {runLabel}. L&apos;operazione non può essere annullata.
          </DialogDescription>
        </DialogHeader>
        {hasError && (
          <p role="alert" className="text-[13px] text-danger">
            Impossibile eliminare la run. Riprova.
          </p>
        )}
        <DialogFooter>
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onCancel} disabled={isDeleting}>
            Annulla
          </button>
          <button
            type="button"
            className={`${PRIMARY_BUTTON_CLASS} !bg-danger`}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Eliminazione…" : "Elimina"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
