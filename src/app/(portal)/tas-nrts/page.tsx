"use client";

import { useState, useEffect } from "react";
import { useNrts, useNrtDetailsScenarios, useFlakyScenarios, useNrtsSuites } from "@/hooks/useNrts";
import { useSuites } from "@/hooks/useSuites";
import NrtsTable from "@/components/nrts/NrtsTable";
import { SuiteCard } from "@/components/nrts/SuiteCard";
import type { FlakyScenario } from "@/types";
import { NRT_PAGE_SIZE } from "@/utils/nrtsCostants";

export default function TasNrtsPage() {
  const [page, setPage] = useState(1);
  const [selectedNrtId, setSelectedNrtId] = useState<string | undefined>();
  const {
    data: selectedNrtDetails,
    isLoading: isDetailsLoading,
    isError: hasDetailsError,
  } = useNrtDetailsScenarios(selectedNrtId);
  const [selectedSuite, setSelectedSuite] = useState<string | undefined>("");
  const { data: nrtsData, isLoading, error } = useNrts({
        origin: "TAS",
        test_object: selectedSuite,
        page: page
    });
  const { data: suitesList, isLoading: isLoadingSuites } = useSuites(
    {origin:"TAS"}
  );
  const [nrts, setNrts] = useState(nrtsData?.items ?? []);
  var totalPages = Math.ceil((nrtsData?.total ?? 0) / NRT_PAGE_SIZE);
  const [modified, setIsModified] = useState(false);
  const [flakyScenarios, setFlakyScenarios] = useState<FlakyScenario[]>([]);
  const { data: flakyScenariosData } = useFlakyScenarios();
  const { data: suitesData, isLoading: suitesLoading } = useNrtsSuites();

  useEffect(() => {
      setNrts(nrtsData?.items ?? []);
      totalPages = Math.ceil((nrtsData?.total ?? 0) / NRT_PAGE_SIZE);
  }, [nrtsData]);

  useEffect(() => {
      setFlakyScenarios(flakyScenariosData ?? []);
  }, [flakyScenariosData]);

  function handleSuiteCardClick(testObject: string) {
    setSelectedSuite((prev) => (prev === testObject ? undefined : testObject));
    setPage(1);
  }

  useEffect(() => {
      const updatedNrts = nrts.map(nrt => {
          if (nrt.test_run?.id === selectedNrtId) {
              return {
                  ...nrt,
                  test_execution: selectedNrtDetails ?? []
              };
          }
          return nrt;
      });
      setNrts(updatedNrts);
  }, [selectedNrtDetails]);

  if (isLoading || isLoadingSuites) return <p className="text-text-muted text-[13px]">Caricamento...</p>;

  return (
    <div className="flex flex-col gap-6"> 
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-text">TAS NRTs (Test automation services - Non-regression tests)</h1>
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
            {suitesData
              ?.filter(({ suite }) => suitesList?.includes(suite.test_object))
              .map(({ suite, latest_run, trend }) => (
                <SuiteCard
                  key={suite.test_object}
                  suite={suite}
                  latestRun={latest_run}
                  trend={trend}
                  onClick={() => handleSuiteCardClick(suite.test_object)}
                />
              ))}
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
      runs={nrts} 
      onNrtsChange={setNrts}
      totalPages={totalPages} 
      onRowClick={setSelectedNrtId} 
      selectedNrt={selectedNrtId} 
      isDetailsLoading={isDetailsLoading} 
      hasDetailsError={hasDetailsError} 
      modified={modified} 
      onModifiedChange={setIsModified} 
      flakyScenarios={flakyScenarios}
      setFlakyScenarios={setFlakyScenarios}
      page={page}
      setPage={setPage}
      isTasOnly={true}
    />
    )}
    </div>
  );
}