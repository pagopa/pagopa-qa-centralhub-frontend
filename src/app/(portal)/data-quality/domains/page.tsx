"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDqDomains } from "@/hooks/useDq";
import { InstanceTable } from "@/components/dq/InstanceTable";
import { DomainManagerDialog } from "@/components/dq/DomainManagerDialog";
import { Gate } from "@/lib/permissions";
import type { DqCategory } from "@/types/index";

const CATEGORIES: { value: DqCategory; label: string }[] = [
  { value: "puntuale", label: "Controlli Puntuali" },
  { value: "intra_entita", label: "Controlli Intra-entità" },
  { value: "cross_entita", label: "Controlli Cross-entità" },
];

export default function DqDomainsPage() {
  const { data: domains, isLoading } = useDqDomains();
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);

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
        <DomainManagerDialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-text">Controlli per Dominio</h1>
        {manageButton}
      </div>

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
                  <InstanceTable domainId={domain.id} category={c.value} />
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
