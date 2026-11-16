"use client";

import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ApplicationDetailSheetProps {
  applicationId: string | null;
  onClose: () => void;
}

/** Placeholder until the application detail (history timeline) is built. */
export function ApplicationDetailSheet({ applicationId, onClose }: ApplicationDetailSheetProps) {
  if (applicationId === null) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogTitle>Dettaglio applicazione</DialogTitle>
        <DialogClose
          render={
            <button
              type="button"
              className="inline-flex h-8 items-center justify-self-end rounded-lg border border-border px-3 text-sm font-medium text-text hover:bg-hover"
            />
          }
        >
          Chiudi
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
