"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { DqCategory, DqControlInstance } from "@/types/index";
import { useDeleteDqInstance, useDqInstances } from "@/hooks/useDq";
import { DqBadge } from "@/components/dq/DqBadge";
import { InstanceDialog } from "@/components/dq/InstanceDialog";
import { Gate } from "@/lib/permissions";

export function InstanceTable({ domainId, category }: { domainId: string; category: DqCategory }) {
  const { data: instances, isLoading } = useDqInstances(domainId, category);
  const deleteInstance = useDeleteDqInstance();
  const [dialogState, setDialogState] = useState<{ open: boolean; instance: DqControlInstance | null }>({
    open: false,
    instance: null,
  });

  const handleDelete = (instance: DqControlInstance) => {
    if (
      window.confirm(
        `Eliminare il controllo "${instance.catalog_control.name}" su ${instance.table_ref}.${instance.field_ref}?`,
      )
    ) {
      deleteInstance.mutate(instance.id);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Gate action="manage:data_quality">
          <button
            onClick={() => setDialogState({ open: true, instance: null })}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-surface text-[var(--accent)] text-[13px] px-3 py-1.5 hover:bg-hover transition-colors"
          >
            <Plus size={14} /> Nuova istanza
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
                <th className="text-left px-4 py-2 font-medium text-text-muted">Controllo</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Tabella</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Campo</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Owner</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Rischio</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Impatto</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Stato</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Note</th>
                <th className="w-16 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {instances?.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center px-4 py-8 text-text-muted">
                    Nessuna istanza configurata
                  </td>
                </tr>
              )}
              {instances?.map((instance) => (
                <tr key={instance.id} className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                  <td className="px-4 py-2 font-semibold">{instance.catalog_control.name}</td>
                  <td className="px-4 py-2 font-mono text-[12px] text-text-dim">{instance.table_ref}</td>
                  <td className="px-4 py-2 font-mono text-[12px] text-text-dim">{instance.field_ref}</td>
                  <td className="px-4 py-2">{instance.owner ?? "—"}</td>
                  <td className="px-4 py-2">
                    <DqBadge variant="risk" value={instance.risk} />
                  </td>
                  <td className="px-4 py-2">
                    <DqBadge variant="risk" value={instance.impact} />
                  </td>
                  <td className="px-4 py-2">
                    <DqBadge variant="status" value={instance.status} />
                  </td>
                  <td className="px-4 py-2 text-text-dim text-[12px]">{instance.notes ?? "—"}</td>
                  <td className="px-2 py-2">
                    <Gate action="manage:data_quality">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDialogState({ open: true, instance })}
                          className="text-text-muted hover:bg-hover rounded-[var(--radius-sm)] p-1"
                          aria-label="Modifica istanza"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(instance)}
                          className="text-danger hover:bg-hover rounded-[var(--radius-sm)] p-1"
                          aria-label="Elimina istanza"
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

      <InstanceDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        domainId={domainId}
        category={category}
        instance={dialogState.instance}
      />
    </div>
  );
}
