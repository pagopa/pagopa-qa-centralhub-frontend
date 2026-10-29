"use client";

import { useState } from "react";
import { useNrts, useNrtDetailsScenarios, useFlakyScenarios, useNrtsSuites } from "@/hooks/useNrts";
import { useSuites } from "@/hooks/useSuites";
import NrtsTable from "@/components/nrts/NrtsTable";
import type { NrtsListObject } from "@/types";
import { NRT_PAGE_SIZE } from "@/utils/nrtsCostants";
import  {SuiteCard} from "@/components/nrts/SuiteCard";

export default function NrtsPage() {
  const [page, setPage] = useState(1);
  const [selectedSuite, setSelectedSuite] = useState<string | undefined>("");
  const [selectedNrtId, setSelectedNrtId] = useState<string | undefined>();
  const {
    data: selectedNrtDetails,
    isLoading: isDetailsLoading,
    isError: hasDetailsError,
  } = useNrtDetailsScenarios(selectedNrtId);
  const { data: nrtsData, isLoading, error } = useNrts({
        test_object: selectedSuite,
        page: page,
    });
  const { data: suitesList } = useSuites();
  const [nrtsWithSelectedDetails, setNrtsWithSelectedDetails] = useState<NrtsListObject[]>([]);
  const totalPages = Math.ceil((nrtsData?.total ?? 0) / NRT_PAGE_SIZE);
  const [modified, setIsModified] = useState(false);
  const { data: flakyScenariosData } = useFlakyScenarios();
  const { data: suitesData, isLoading: suitesLoading } = useNrtsSuites();
  

  function handleNrtsChange(nrts: NrtsListObject[]) {
    setNrtsWithSelectedDetails(nrts);

  }

  function handleSuiteCardClick(testObject: string) {
    setSelectedSuite((prev) => prev !== testObject ? testObject : undefined);
    setPage(1);
    setSelectedNrtId(undefined);
    setIsModified(false);
    setNrtsWithSelectedDetails([]);
  }
  
  let nrtsToUse =  nrtsWithSelectedDetails.length === 0 ? nrtsData?.items ?? [] : nrtsWithSelectedDetails;
  if (selectedNrtId !== undefined && selectedNrtDetails !== undefined) {
    nrtsToUse = nrtsToUse.map((nrt) => {
      if (nrt.test_run.id !== selectedNrtId) return nrt;
      const localScenarios = nrtsWithSelectedDetails.find(
        (run) => run.test_run.id === selectedNrtId,
      )?.test_execution;
      return {
        ...nrt,
        test_execution: selectedNrtDetails.map((scenario) => {
          const localScenario = localScenarios?.find((local) => local.id === scenario.id);
          return localScenario
            ? { ...scenario, revision_note: localScenario.revision_note }
            : scenario;
        }),
      };
    });
  }


  if (isLoading) return <p className="text-text-muted text-[13px]">Caricamento...</p>;

  return (
     <>
      <div className="flex flex-col gap-6"> 
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-text">NRTs (Non-Regression Test)</h1>
          <span className="text-[13px] text-text-muted font-mono">({nrtsData?.total ?? 0} totali)</span>
      </div>
          <div>
            <p
              className="font-mono uppercase text-text-muted mb-3"
              style={{ fontSize: 10, letterSpacing: ".06em" }}
            >
              Suite — ultimo run
            </p>
            {suitesLoading ? (
              <p className="text-text-muted text-[13px]">Caricamento…</p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {suitesData?.map(({ suite, latest_run, trend }) => (
                  <SuiteCard
                    key={suite.test_object}
                    suite={suite}
                    latestRun={latest_run}
                    trend={trend}
                    onClick={() => handleSuiteCardClick(suite.test_object)}
                  />
                ))}
                {suitesData?.length === 0 && (
                  <p className="text-text-muted text-[13px]">
                    Nessuna suite configurata. Vai in Settings → Integrations.
                  </p>
                )}
              </div>
            )}
          </div>

      <div className="flex flex-col w-full gap-5">
          <select
            className="w-50 rounded-[var(--radius-sm)] border border-border bg-surface text-text text-base px-2 py-1"
            value={selectedSuite ?? ""}
            onChange={(e) => handleSuiteCardClick(e.target.value)}
          >
            <option value="">Tutte le suite</option>
            {suitesList?.map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
    </div>
    {(error != null ? <div className="text-text-muted text-[13px]">Errore nel caricamento degli NRT</div> : 
    <NrtsTable
      runs={nrtsToUse} // NRTS
      onNrtsChange={handleNrtsChange} // aggiorna NRTS
      totalPages={totalPages} // pagine
      onRowClick={setSelectedNrtId} // seleziona NRT
      selectedNrt={selectedNrtId} // NRT selezionato
      isDetailsLoading={isDetailsLoading} // caricamento dettagli NRT
      hasDetailsError={hasDetailsError} // errore caricamento dettagli NRT
      modified={modified} // stato modificato
      onModifiedChange={setIsModified} // aggiorna stato modificato
      page={page}
      setPage={setPage}
      isTasOnly={false}
      flakyScenariosData={flakyScenariosData ?? []}
    />
    )}
    </div>
    </>
  );
}