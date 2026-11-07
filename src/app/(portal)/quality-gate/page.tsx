"use client";

import OriginNrtsPage from "@/components/nrts/OriginNrtsPage";
import { QualityGateLaunchPanel } from "@/components/nrts/QualityGateLaunchPanel";
import { Gate } from "@/lib/permissions";
import { useSuites } from "@/hooks/useSuites";

export default function QualityGatePage() {
  // Suites that already have QG runs are offered as suggestions; any valid suite name can be typed.
  const { data: suites } = useSuites({ origin: "QG" });
  return (
    <OriginNrtsPage origin="QG" title="Quality Gate (esecuzioni TAS come gate)">
      <Gate action="run:qg">
        <QualityGateLaunchPanel suites={suites ?? []} />
      </Gate>
    </OriginNrtsPage>
  );
}
