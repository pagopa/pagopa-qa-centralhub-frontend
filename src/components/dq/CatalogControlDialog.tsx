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
import type { DqCatalogControl, DqCategory } from "@/types/index";
import { useCreateDqCatalogControl, useDqDimensions, useUpdateDqCatalogControl } from "@/hooks/useDq";

export function CatalogControlDialog({
  open,
  onOpenChange,
  category,
  control,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: DqCategory;
  control: DqCatalogControl | null;
}) {
  const { data: dimensions } = useDqDimensions();
  const createControl = useCreateDqCatalogControl();
  const updateControl = useUpdateDqCatalogControl();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dimensionId, setDimensionId] = useState("");

  useEffect(() => {
    if (open) {
      setName(control?.name ?? "");
      setDescription(control?.description ?? "");
      setDimensionId(control?.dimension_id ?? dimensions?.[0]?.id ?? "");
    }
  }, [open, control, dimensions]);

  const isPending = createControl.isPending || updateControl.isPending;

  const handleSubmit = () => {
    if (!name.trim() || !dimensionId) return;
    const payload = {
      category,
      name: name.trim(),
      description: description.trim(),
      dimension_id: dimensionId,
    };
    if (control) {
      updateControl.mutate({ id: control.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createControl.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{control ? "Modifica controllo" : "Nuovo controllo"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[13px]">
            Nome controllo
            <input
              className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Descrizione
            <textarea
              className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px]">
            Dimensione DQ
            <Select value={dimensionId} onValueChange={(value) => setDimensionId(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona dimensione" />
              </SelectTrigger>
              <SelectContent>
                {dimensions?.map((dim) => (
                  <SelectItem key={dim.id} value={dim.id}>
                    {dim.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        <DialogFooter>
          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim() || !dimensionId}
            className="rounded-[var(--radius-sm)] border border-[var(--accent)] bg-surface text-[var(--accent)] text-[13px] px-3 py-1.5 hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salva
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
