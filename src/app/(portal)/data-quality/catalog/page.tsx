"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogTable } from "@/components/dq/CatalogTable";
import { DqInfoPanel } from "@/components/dq/DqInfoPanel";
import { DimensionManagerDialog } from "@/components/dq/DimensionManagerDialog";
import { Gate } from "@/lib/permissions";
import type { DqCategory } from "@/types/index";

const CATEGORIES: { value: DqCategory; label: string }[] = [
  { value: "puntuale", label: "Controlli Puntuali" },
  { value: "intra_entita", label: "Controlli Intra-entità" },
  { value: "cross_entita", label: "Controlli Cross-entità" },
];

export default function DqCatalogPage() {
  const [dimensionDialogOpen, setDimensionDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-text">Catalogo Controlli DQ</h1>
        <Gate action="manage:data_quality">
          <button
            onClick={() => setDimensionDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors"
          >
            <Settings size={14} /> Gestisci Dimensioni
          </button>
        </Gate>
      </div>

      <DqInfoPanel />

      <Tabs defaultValue="puntuale">
        <TabsList>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map((c) => (
          <TabsContent key={c.value} value={c.value}>
            <CatalogTable category={c.value} />
          </TabsContent>
        ))}
      </Tabs>

      <DimensionManagerDialog open={dimensionDialogOpen} onOpenChange={setDimensionDialogOpen} />
    </div>
  );
}
