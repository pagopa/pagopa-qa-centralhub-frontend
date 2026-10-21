"use client";

import { useMemo, useState } from "react";
import { Download, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDqAllInstances, useDqDimensions, useDqDomains } from "@/hooks/useDq";
import { InstanceTable } from "@/components/dq/InstanceTable";
import { DqNamingGuide } from "@/components/dq/DqNamingGuide";
import { DomainManagerDialog } from "@/components/dq/DomainManagerDialog";
import { DqStatTiles } from "@/components/dq/DqStatTiles";
import { Gate } from "@/lib/permissions";
import { DQ_CATEGORIES as CATEGORIES, domainTileGroups, exportFileName, instanceSheets } from "@/lib/dq-report";
import { downloadXlsx } from "@/lib/xlsx";

export default function DqDomainsPage() {
  const { data: domains, isLoading } = useDqDomains();
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const instances = useDqAllInstances();
  const dimensions = useDqDimensions();
  const tileGroups = useMemo(
    () => domainTileGroups(instances.data ?? [], domains ?? [], dimensions.data ?? []),
    [instances.data, domains, dimensions.data],
  );

  const handleExport = () =>
    downloadXlsx(exportFileName("controlli_dq_per_dominio"), instanceSheets(instances.data ?? [], domains ?? []));

  const exportButton = (
    <button onClick={handleExport} disabled={instances.isLoading || !instances.data}
      title="Scarica i controlli di tutti i domini: un foglio per categoria, con il dominio in colonna"
      className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors disabled:opacity-50">
      <Download size={14} /> Esporta Excel
    </button>
  );

  const manageButton = (
    <Gate action="manage:data_quality">
      <button
        onClick={() => setDomainDialogOpen(true)}
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors"
      >
        <Settings size={14} /> Gestisci Domini
      </button>
    </Gate>
  );

  if (isLoading) return <p className="text-text-muted text-[13px]">Caricamento…</p>;
  if (!domains || domains.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-text">Controlli per Dominio</h1>
          {manageButton}
        </div>
        <p className="text-text-muted text-[13px]">Nessun dominio configurato</p>
        <DqNamingGuide />
        <DomainManagerDialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-text">Controlli per Dominio</h1>
        <div className="flex items-center gap-2">
          {exportButton}
          {manageButton}
        </div>
      </div>

      <DqStatTiles groups={tileGroups} loading={instances.isLoading || dimensions.isLoading} />

      <DqNamingGuide />

      <Tabs defaultValue={domains[0].id}>
        <TabsList>
          {domains.map((domain) => (
            <TabsTrigger key={domain.id} value={domain.id}>
              {domain.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {domains.map((domain) => (
          <TabsContent key={domain.id} value={domain.id}>
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
                  <InstanceTable key={`${domain.id}-${c.value}`} domainId={domain.id} category={c.value} />
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>

      <DomainManagerDialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen} />
    </div>
  );
}
