"use client";

import { useState, type ReactNode } from "react";
import { useNrts, useNrtDetailsScenarios, useNrtsSuites } from "@/hooks/useNrts";
import { useSuites } from "@/hooks/useSuites";
import NrtsTable from "@/components/nrts/NrtsTable";
import type { NrtsListObject } from "@/types";
import { SuiteCard } from "@/components/nrts/SuiteCard";
import { NRT_PAGE_SIZE } from "@/utils/nrtsCostants";
import type { RunOrigin } from "@/utils/nrtUtils";
import { ApiError } from "@/lib/api";
import { SELECT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { RefreshCw } from "lucide-react";

export interface OriginNrtsPageProps {
  origin: RunOrigin;
  title: string;
  /** Rendered between the title and the suite cards (e.g. the Quality Gate launch form). */
  children?: ReactNode;
}

// The backend answers 404 when no run matches: that is an empty list, not a failure.
function isEmptyResult(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export default function OriginNrtsPage({ origin, title, children }: OriginNrtsPageProps) {
  const [page, setPage] = useState(1);
  const [selectedNrtId, setSelectedNrtId] = useState<string | undefined>();
  const {
    data: selectedNrtDetails,
    isLoading: isDetailsLoading,
    isError: hasDetailsError,
  } = useNrtDetailsScenarios(selectedNrtId);
  const [selectedSuite, setSelectedSuite] = useState<string | undefined>("");
  const { data: nrtsData, isLoading, error, refetch: refetchNrts, isFetching: isFetchingNrts } = useNrts({
        origin,
        test_object: selectedSuite,
        page: page
    });
  const { data: suitesList, isLoading: isLoadingSuites } = useSuites(
    { origin }
  );
  const totalPages = Math.ceil((nrtsData?.total ?? 0) / NRT_PAGE_SIZE);
  const [modified, setIsModified] = useState(false);
  const { data: suitesData, isLoading: suitesLoading, refetch: refetchSuites, isFetching: isFetchingSuites } = useNrtsSuites({
    origin
  });
  const [nrtsWithSelectedDetails, setNrtsWithSelectedDetails] = useState<NrtsListObject[]>([]);
    
  const isRefreshing = isFetchingNrts || isFetchingSuites;

  function handleRefresh() {
    // Drop locally cached row edits so the refreshed rows are shown as returned by the backend.
    setNrtsWithSelectedDetails([]);
    setIsModified(false);
    void Promise.all([refetchNrts(), refetchSuites()]);
  }

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


  if (isLoading || isLoadingSuites) return <p className="text-text-muted text-[13px]">Caricamento...</p>;

  return (
    <div className="flex flex-col gap-6"> 
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        <span className="text-[13px] text-text-muted font-mono">({nrtsData?.total ?? 0} totali)</span>
      </div>
      {children}
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
              .map(({ suite, trend }) => (
                <SuiteCard
                  key={suite.test_object}
                  suite={suite}
                  trend={trend}
                  onClick={() => handleSuiteCardClick(suite.test_object)}
                />
              ))}
          </div>
        )}
      </div>
      <div className="flex w-full items-center gap-3">
          <select
            className={`${SELECT_CLASS} w-56`}
            value={selectedSuite ?? ""}
            onChange={(e) => handleSuiteCardClick(e.target.value)}
          >
            <option value="">Tutte le suite</option>
            {suitesList?.map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Aggiorna elenco"
            className={SECONDARY_BUTTON_CLASS}
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden />
            Aggiorna
          </button>
    </div>
    {(error != null && !isEmptyResult(error) ? <div className="text-text-muted text-[13px]">Errore nel caricamento degli NRT</div> : 
    <NrtsTable
      runs={nrtsToUse} 
      onNrtsChange={handleNrtsChange}
      totalPages={totalPages} 
      onRowClick={setSelectedNrtId} 
      selectedNrt={selectedNrtId} 
      isDetailsLoading={isDetailsLoading} 
      hasDetailsError={hasDetailsError} 
      modified={modified} 
      onModifiedChange={setIsModified} 
      flakyScenariosData={[]}
      page={page}
      setPage={setPage}
      isTasOnly={true}
      origin={origin}
    />
    )}
    </div>
  );
}