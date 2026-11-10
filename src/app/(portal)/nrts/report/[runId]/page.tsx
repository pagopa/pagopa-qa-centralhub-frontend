"use client";

import { RunReportPage } from "@/components/nrts/RunReportPage";

/** Report of a single NRT run: the same report the Quality Gate has, opened from a link. */
export default function NrtReportPage() {
  return <RunReportPage kind="nrt" listHref="/nrts" listAction="view:nrts" />;
}
