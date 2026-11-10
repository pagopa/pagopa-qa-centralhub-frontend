"use client";

import { RunReportPage } from "@/components/nrts/RunReportPage";

export default function QualityGateReportPage() {
  return <RunReportPage kind="qg" listHref="/quality-gate" listAction="view:qg_nrts" />;
}
