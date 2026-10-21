"use client";

import { useMemo, useState } from "react";
import { Download, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogTable } from "@/components/dq/CatalogTable";
import { DqInfoPanel } from "@/components/dq/DqInfoPanel";
import { DimensionManagerDialog } from "@/components/dq/DimensionManagerDialog";
import { DqStatTiles } from "@/components/dq/DqStatTiles";
import { useDqAllInstances, useDqCatalog, useDqDimensions } from "@/hooks/useDq";
import { Gate } from "@/lib/permissions";
import { DQ_CATEGORIES as CATEGORIES, catalogSheets, catalogTileGroups, exportFileName } from "@/lib/dq-report";
import { downloadXlsx } from "@/lib/xlsx";

export default function DqCatalogPage() {
  const [dimensionDialogOpen, setDimensionDialogOpen] = useState(false);
  const catalog = useDqCatalog();
  const dimensions = useDqDimensions();
  const instances = useDqAllInstances();
  const loading = catalog.isLoading || dimensions.isLoading || instances.isLoading;
  const tileGroups = useMemo(
    () => catalogTileGroups(catalog.data ?? [], dimensions.data ?? [], instances.data ?? []),
    [catalog.data, dimensions.data, instances.data],
  );

  const handleExport = () =>
    downloadXlsx(exportFileName("catalogo_controlli_dq"), catalogSheets(catalog.data ?? [], instances.data ?? []));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-text">Catalogo Controlli DQ</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={loading || !catalog.data}
            title="Scarica tutto il catalogo: un foglio per categoria"
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors disabled:opacity-50">
            <Download size={14} /> Esporta Excel
          </button>
          <Gate action="manage:data_quality">
            <button
              onClick={() => setDimensionDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors"
            >
              <Settings size={14} /> Gestisci Dimensioni
            </button>
          </Gate>
        </div>
      </div>

      <DqStatTiles groups={tileGroups} loading={loading} />

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
