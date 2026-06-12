"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { DqCatalogControl, DqCategory } from "@/types/index";
import { useDeleteDqCatalogControl, useDqCatalog } from "@/hooks/useDq";
import { CatalogControlDialog } from "@/components/dq/CatalogControlDialog";
import { Gate } from "@/lib/permissions";

export function CatalogTable({ category }: { category: DqCategory }) {
  const { data: controls, isLoading } = useDqCatalog(category);
  const deleteControl = useDeleteDqCatalogControl();
  const [dialogState, setDialogState] = useState<{ open: boolean; control: DqCatalogControl | null }>({
    open: false,
    control: null,
  });

  const handleDelete = (control: DqCatalogControl) => {
    if (window.confirm(`Eliminare il controllo "${control.name}"?`)) {
      deleteControl.mutate(control.id);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Gate action="manage:data_quality">
          <button
            onClick={() => setDialogState({ open: true, control: null })}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-surface text-[var(--accent)] text-[13px] px-3 py-1.5 hover:bg-hover transition-colors"
          >
            <Plus size={14} /> Nuovo controllo
          </button>
        </Gate>
      </div>

      {isLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : (
        <div className="rounded-[var(--radius)] border border-border overflow-hidden bg-surface">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th className="text-left px-4 py-2 font-medium text-text-muted">Nome</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Descrizione</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Dimensione</th>
                <th className="w-16 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {controls?.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center px-4 py-8 text-text-muted">
                    Nessun controllo definito
                  </td>
                </tr>
              )}
              {controls?.map((control) => (
                <tr key={control.id} className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                  <td className="px-4 py-2 font-semibold">{control.name}</td>
                  <td className="px-4 py-2 text-text-dim">{control.description}</td>
                  <td className="px-4 py-2 text-text-dim">{control.dimension.name}</td>
                  <td className="px-2 py-2">
                    <Gate action="manage:data_quality">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDialogState({ open: true, control })}
                          className="text-text-muted hover:bg-hover rounded-[var(--radius-sm)] p-1"
                          aria-label="Modifica controllo"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(control)}
                          className="text-danger hover:bg-hover rounded-[var(--radius-sm)] p-1"
                          aria-label="Elimina controllo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Gate>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CatalogControlDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        category={category}
        control={dialogState.control}
      />
    </div>
  );
}
