"use client";

import OriginNrtsPage from "@/components/nrts/OriginNrtsPage";
import { TestRunLaunchPanel } from "@/components/nrts/TestRunLaunchPanel";
import { Gate } from "@/lib/permissions";
import { useSuites } from "@/hooks/useSuites";

export default function TasNrtsPage() {
  // Suites that already have TAS runs are offered as suggestions; any valid suite name can be typed.
  const { data: suites } = useSuites({ origin: "TAS" });
  return (
    <OriginNrtsPage origin="TAS" title="TAS (Test Automation Services)">
      <Gate action="run:tas">
        <TestRunLaunchPanel origin="TAS" suites={suites ?? []} />
      </Gate>
    </OriginNrtsPage>
  );
}
