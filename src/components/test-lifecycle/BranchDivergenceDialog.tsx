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
import { safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlBranchSyncState } from "@/types/test-lifecycle";

/** The feature file changed on the repository: accept that version or overwrite it with the hub's. */
export function BranchDivergenceDialog({
  open,
  state,
  compareUrl,
  busy,
  error,
  onAccept,
  onOverwrite,
  onClose,
}: {
  open: boolean;
  state: TlBranchSyncState | undefined;
  compareUrl: string | null | undefined;
  busy: boolean;
  error: string | null;
  onAccept: () => void;
  onOverwrite: () => void;
  onClose: () => void;
}) {
  const diverged = state === "diverged";
  const link = safeHttpUrl(compareUrl);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Il file sul repo è cambiato</DialogTitle>
          <DialogDescription>
            {diverged
              ? "Il feature file è cambiato sia sul repo sia nell'hub dall'ultimo allineamento."
              : "Il feature file sul repo è stato modificato fuori dall'hub."}
          </DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-text-dim">
          <li>
            <strong className="text-text">Accetta la versione del repo</strong>: scenari e anteprima
            diventano quelli del repo
            {diverged ? "; le modifiche dell'hub dall'ultimo allineamento andranno perse" : ""}.
          </li>
          <li>
            <strong className="text-text">Sovrascrivi il repo con l&apos;hub</strong>: il file sul branch
            diventa quello dell&apos;hub; le modifiche fatte sul repo a quel file andranno perse.
          </li>
        </ul>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[var(--accent)] hover:underline">
            Vedi le differenze su GitHub
          </a>
        )}
        {error && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <DialogFooter>
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onClose}>
            Decido dopo
          </button>
          <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={busy} onClick={onOverwrite}>
            Sovrascrivi il repo con l&apos;hub
          </button>
          <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={busy} onClick={onAccept}>
            Accetta la versione del repo
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
