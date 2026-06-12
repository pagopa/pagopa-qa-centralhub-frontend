"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateDqDomain,
  useDeleteDqDomain,
  useDqDomains,
  useUpdateDqDomain,
} from "@/hooks/useDq";

export function DomainManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: domains, isLoading } = useDqDomains();
  const createDomain = useCreateDqDomain();
  const updateDomain = useUpdateDqDomain();
  const deleteDomain = useDeleteDqDomain();

  const [newName, setNewName] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(0);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createDomain.mutate(
      { name: newName.trim(), sort_order: newSortOrder },
      { onSuccess: () => { setNewName(""); setNewSortOrder(0); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestisci Domini</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {isLoading && <p className="text-text-muted text-[13px]">Caricamento…</p>}
          {domains?.map((domain) => (
            <div key={domain.id} className="flex items-center gap-2">
              <input
                className="flex-1 rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-[13px]"
                defaultValue={domain.name}
                onBlur={(e) => {
                  if (e.target.value !== domain.name && e.target.value.trim()) {
                    updateDomain.mutate({ id: domain.id, name: e.target.value.trim() });
                  }
                }}
              />
              <input
                type="number"
                className="w-16 rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-[13px]"
                defaultValue={domain.sort_order}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isNaN(value) && value !== domain.sort_order) {
                    updateDomain.mutate({ id: domain.id, sort_order: value });
                  }
                }}
              />
              <button
                onClick={() => deleteDomain.mutate(domain.id)}
                className="text-danger hover:bg-hover rounded-[var(--radius-sm)] p-1"
                aria-label="Elimina dominio"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <input
            className="flex-1 rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-[13px]"
            placeholder="Nuovo dominio"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            className="w-16 rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-[13px]"
            value={newSortOrder}
            onChange={(e) => setNewSortOrder(Number(e.target.value))}
          />
        </div>

        <DialogFooter>
          <button
            onClick={handleCreate}
            disabled={createDomain.isPending || !newName.trim()}
            className="rounded-[var(--radius-sm)] border border-[var(--accent)] bg-surface text-[var(--accent)] text-[13px] px-3 py-1.5 hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aggiungi
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
