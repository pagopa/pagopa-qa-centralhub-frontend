"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useE2eSuites } from "@/hooks/useE2eSuites";
import { useE2eRuns } from "@/hooks/useE2eRuns";
import { SuiteCard } from "@/components/e2e/SuiteCard";
import { RunTable } from "@/components/e2e/RunTable";
import { RunModal } from "@/components/e2e/RunModal";
import type { E2eRunWithSuite } from "@/types/index";

export default function E2EPage() {
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | undefined>();
  const [selectedRun, setSelectedRun] = useState<E2eRunWithSuite | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const queryClient = useQueryClient();
  const { data: suitesData, isLoading: suitesLoading } = useE2eSuites();
  const { data: runsData, isLoading: runsLoading } = useE2eRuns({
    suiteId: selectedSuiteId,
  });

  const suites = suitesData?.map((s) => s.suite) ?? [];
  const runs = runsData?.items ?? [];
  const total = runsData?.total ?? 0;

  function handleRowClick(run: E2eRunWithSuite) {
    setSelectedRun(run);
    setModalOpen(true);
  }

  function handleSuiteCardClick(suiteId: string) {
    setSelectedSuiteId((prev) => (prev === suiteId ? undefined : suiteId));
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await apiClient("/api/v1/e2e/sync", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["e2e"] });
    } catch {
      // ignore errors
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text">E2E Tests</h1>

      {/* Suite cards */}
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
                key={suite.id}
                suite={suite}
                latestRun={latest_run}
                trend={trend}
                onClick={() => handleSuiteCardClick(suite.id)}
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

      {/* Run table */}
      {runsLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento runs…</p>
      ) : (
        <RunTable
          suites={suites}
          runs={runs}
          total={total}
          selectedSuiteId={selectedSuiteId}
          onSuiteFilter={setSelectedSuiteId}
          onRowClick={handleRowClick}
          onSync={handleSync}
          syncing={syncing}
        />
      )}

      <RunModal
        run={selectedRun}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
