"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDqDomains } from "@/hooks/useDq";
import { InstanceTable } from "@/components/dq/InstanceTable";
import type { DqCategory } from "@/types/index";

const CATEGORIES: { value: DqCategory; label: string }[] = [
  { value: "puntuale", label: "Controlli Puntuali" },
  { value: "intra_entita", label: "Controlli Intra-entità" },
  { value: "cross_entita", label: "Controlli Cross-entità" },
];

export default function DqDomainsPage() {
  const { data: domains, isLoading } = useDqDomains();

  if (isLoading) return <p className="text-text-muted text-[13px]">Caricamento…</p>;
  if (!domains || domains.length === 0) {
    return <p className="text-text-muted text-[13px]">Nessun dominio configurato</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text">Controlli per Dominio</h1>

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
    </div>
  );
}
