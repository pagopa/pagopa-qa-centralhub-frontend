"use client";

import OriginNrtsPage from "@/components/nrts/OriginNrtsPage";
import { NrtLaunchPanel } from "@/components/nrts/NrtLaunchPanel";
import { Gate } from "@/lib/permissions";

export default function NrtsPage() {
  return (
    <OriginNrtsPage origin="NRT" title="NRTs (Non-Regression Test)">
      <Gate action="run:nrt">
        <NrtLaunchPanel />
      </Gate>
    </OriginNrtsPage>
  );
}
