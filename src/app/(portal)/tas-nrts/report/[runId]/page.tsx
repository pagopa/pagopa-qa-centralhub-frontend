"use client";

import { RunReportPage } from "@/components/nrts/RunReportPage";

/** Report of a single TAS run: the same report the Quality Gate has, opened from a link. */
export default function TasReportPage() {
  return <RunReportPage kind="tas" listHref="/tas-nrts" listAction="view:tas_nrts" />;
}
