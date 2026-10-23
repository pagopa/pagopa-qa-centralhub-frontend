"use client";

import { useState, useEffect } from "react";
import { useNrts, useNrtDetailsScenarios, useFlakyScenarios, useNrtsSuites } from "@/hooks/useNrts";
import { useSuites } from "@/hooks/useSuites";
import NrtsTable from "@/components/nrts/NrtsTable";
import type { FlakyScenario } from "@/types";
import { NRT_PAGE_SIZE } from "@/utils/nrtsCostants";
import  {SuiteCard} from "@/components/nrts/SuiteCard";

export default function NrtsPage() {
  const [page, setPage] = useState(1);
  const [selectedNrtId, setSelectedNrtId] = useState<string | undefined>();
  const {
    data: selectedNrtDetails,
    isLoading: isDetailsLoading,
    isError: hasDetailsError,
  } = useNrtDetailsScenarios(selectedNrtId);
  const [selectedSuite, setSelectedSuite] = useState<string | undefined>("");
  const { data: nrtsData, isLoading, error } = useNrts({
        test_object: selectedSuite,
        page: page
    });
  const { data: suitesList, isLoading: isLoadingSuites } = useSuites();
  const [nrts, setNrts] = useState(nrtsData?.items ?? []);
  const totalPages = Math.ceil((nrtsData?.total ?? 0) / NRT_PAGE_SIZE);
  const [modified, setIsModified] = useState(false);
  const [flakyScenarios, setFlakyScenarios] = useState<FlakyScenario[]>([]);
  const { data: flakyScenariosData } = useFlakyScenarios();
  const { data: suitesData, isLoading: suitesLoading } = useNrtsSuites();
  

  useEffect(() => {
      setNrts(nrtsData?.items ?? []);
  }, [nrtsData]);

  useEffect(() => {
      setFlakyScenarios(flakyScenariosData ?? []);
  }, [flakyScenariosData]);

    const nrtsWithSelectedDetails = selectedNrtDetails === undefined
    ? nrts
    : nrts.map((nrt) =>
      nrt.test_run.id === selectedNrtId
        ? { ...nrt, test_execution: selectedNrtDetails }
        : nrt,
      );

  function handleSuiteCardClick(testObject: string) {
    setSelectedSuite((prev) => (prev === testObject ? undefined : testObject));
  }

  

  if (isLoading || isLoadingSuites) return <p className="text-text-muted text-[13px]">Caricamento...</p>;

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
            onChange={(e) => {
              setSelectedSuite(e.target.value || undefined);
              setPage(1);
            }}
          >
            <option value="">Tutte le suite</option>
            {suitesList?.map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
    </div>
    {(error != null ? <div className="text-text-muted text-[13px]">Errore nel caricamento degli NRT</div> : 
    <NrtsTable
      runs={nrtsWithSelectedDetails} // NRTS
      onNrtsChange={setNrts} // aggiorna NRTS
      totalPages={totalPages} // pagine
      onRowClick={setSelectedNrtId} // seleziona NRT
      selectedNrt={selectedNrtId} // NRT selezionato
      isDetailsLoading={isDetailsLoading} // caricamento dettagli NRT
      hasDetailsError={hasDetailsError} // errore caricamento dettagli NRT
      modified={modified} // stato modificato
      onModifiedChange={setIsModified} // aggiorna stato modificato
      flakyScenarios={flakyScenarios}
      setFlakyScenarios={setFlakyScenarios}
      page={page}
      setPage={setPage}
      isTasOnly={false}
    />
    )}
    </div>
    </>
  );
}