"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DqCategory, DqControlInstance, DqControlStatus, DqRiskLevel } from "@/types/index";
import { useCreateDqInstance, useDqCatalog, useUpdateDqInstance } from "@/hooks/useDq";

const RISK_LEVELS: DqRiskLevel[] = ["ALTO", "MEDIO", "BASSO"];
const STATUSES: { value: DqControlStatus; label: string }[] = [
  { value: "da_implementare", label: "Da implementare" },
  { value: "in_sviluppo", label: "In sviluppo" },
  { value: "attivo", label: "Attivo" },
  { value: "non_attivo", label: "Non attivo" },
];

export function InstanceDialog({
  open,
  onOpenChange,
  domainId,
  category,
  instance,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainId: string;
  category: DqCategory;
  instance: DqControlInstance | null;
}) {
  const { data: catalogControls } = useDqCatalog(category);
  const createInstance = useCreateDqInstance();
  const updateInstance = useUpdateDqInstance();

  const [catalogControlId, setCatalogControlId] = useState("");
  const [tableRef, setTableRef] = useState("");
  const [fieldRef, setFieldRef] = useState("");
  const [owner, setOwner] = useState("");
  const [risk, setRisk] = useState<DqRiskLevel>("BASSO");
  const [impact, setImpact] = useState<DqRiskLevel>("BASSO");
  const [status, setStatus] = useState<DqControlStatus>("da_implementare");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setCatalogControlId(instance?.catalog_control_id ?? catalogControls?.[0]?.id ?? "");
      setTableRef(instance?.table_ref ?? "");
      setFieldRef(instance?.field_ref ?? "");
      setOwner(instance?.owner ?? "");
      setRisk(instance?.risk ?? "BASSO");
      setImpact(instance?.impact ?? "BASSO");
      setStatus(instance?.status ?? "da_implementare");
      setNotes(instance?.notes ?? "");
    }
  }, [open, instance, catalogControls]);

  const isPending = createInstance.isPending || updateInstance.isPending;

  const handleSubmit = () => {
    if (!catalogControlId || !tableRef.trim() || !fieldRef.trim()) return;

    if (instance) {
      updateInstance.mutate(
        {
          id: instance.id,
          table_ref: tableRef.trim(),
          field_ref: fieldRef.trim(),
          owner: owner.trim() || null,
          risk,
          impact,
          status,
          notes: notes.trim() || null,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createInstance.mutate(
        {
          domain_id: domainId,
          catalog_control_id: catalogControlId,
          table_ref: tableRef.trim(),
          field_ref: fieldRef.trim(),
          owner: owner.trim() || null,
          risk,
          impact,
          status,
          notes: notes.trim() || null,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{instance ? "Modifica istanza" : "Nuova istanza"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[13px]">
            Controllo (catalogo)
            <Select
              value={catalogControlId}
              onValueChange={(v) => setCatalogControlId(v ?? "")}
              disabled={!!instance}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona controllo" />
              </SelectTrigger>
              <SelectContent>
                {catalogControls?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[13px]">
              Tabella
              <input
                className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5 font-mono text-[12px]"
                value={tableRef}
                onChange={(e) => setTableRef(e.target.value)}
                placeholder="pagopa.bronze_gpd_payment_position"
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px]">
              Campo
              <input
                className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5 font-mono text-[12px]"
                value={fieldRef}
                onChange={(e) => setFieldRef(e.target.value)}
                placeholder="after.id"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-[13px]">
            Owner
            <input
              className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-[13px]">
              Rischio
              <Select value={risk} onValueChange={(v) => v && setRisk(v as DqRiskLevel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-[13px]">
              Impatto
              <Select value={impact} onValueChange={(v) => v && setImpact(v as DqRiskLevel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-[13px]">
              Stato
              <Select value={status} onValueChange={(v) => v && setStatus(v as DqControlStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-[13px]">
            Note
            <textarea
              className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <DialogFooter>
          <button
            onClick={handleSubmit}
            disabled={isPending || !catalogControlId || !tableRef.trim() || !fieldRef.trim()}
            className="rounded-[var(--radius-sm)] border border-[var(--accent)] bg-surface text-[var(--accent)] text-[13px] px-3 py-1.5 hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salva
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
