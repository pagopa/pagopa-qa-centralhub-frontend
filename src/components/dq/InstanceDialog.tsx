"use client";

/* eslint-disable react-hooks/set-state-in-effect */

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
import { validateDqCode, validateSodaUrl } from "@/lib/dq-codes";

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
  const [checkName, setCheckName] = useState("");
  const [sodaUrl, setSodaUrl] = useState("");

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
      setCheckName(instance?.check_name ?? "");
      setSodaUrl(instance?.soda_url ?? "");
    }
  }, [open, instance, catalogControls]);

  const isPending = createInstance.isPending || updateInstance.isPending;
  const selectedControl = catalogControls?.find((control) => control.id === catalogControlId);
  const checkNameError = checkName.trim()
    ? selectedControl
      ? validateDqCode(checkName.trim(), selectedControl.category, selectedControl.dimension.name)
      : "Seleziona un controllo di catalogo"
    : "Inserisci l'identificativo check_name di SODA";
  const sodaUrlError = sodaUrl.trim()
    ? validateSodaUrl(sodaUrl.trim())
    : status === "attivo"
      ? "Inserisci il link SODA per i controlli attivi"
      : null;

  const handleSubmit = () => {
    if (!catalogControlId || !tableRef.trim() || !fieldRef.trim() || checkNameError || sodaUrlError) return;

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
          check_name: checkName.trim(),
          soda_url: sodaUrl.trim() || null,
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
          check_name: checkName.trim(),
          soda_url: sodaUrl.trim() || null,
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
                <SelectValue placeholder="Seleziona controllo">
                  {(value: string | null) => catalogControls?.find((c) => c.id === value)?.name ?? "Seleziona controllo"}
                </SelectValue>
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

          <label className="flex flex-col gap-1 text-[13px]">
            ID controllo SODA (`check_name`)
            <input
              className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5 font-mono text-[12px]"
              value={checkName}
              onChange={(event) => setCheckName(event.target.value)}
              placeholder="fld__vld__createddate__date_format"
              aria-invalid={!!checkNameError}
            />
            {checkNameError && <span className="text-[12px] text-danger">{checkNameError}</span>}
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
                  <SelectValue>
                    {(value: string | null) => STATUSES.find((s) => s.value === value)?.label ?? ""}
                  </SelectValue>
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

          {(status === "attivo" || sodaUrl) && (
            <label className="flex flex-col gap-1 text-[13px]">
              Link controllo SODA{status === "attivo" ? " *" : ""}
              <input
                className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5"
                type="url"
                value={sodaUrl}
                onChange={(event) => setSodaUrl(event.target.value)}
                placeholder="https://cloud.soda.io/..."
                aria-invalid={!!sodaUrlError}
              />
              {sodaUrlError && <span className="text-[12px] text-danger">{sodaUrlError}</span>}
            </label>
          )}

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
            disabled={isPending || !catalogControlId || !tableRef.trim() || !fieldRef.trim() || !!checkNameError || !!sodaUrlError}
            className="rounded-[var(--radius-sm)] border border-[var(--accent)] bg-surface text-[var(--accent)] text-[13px] px-3 py-1.5 hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salva
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
