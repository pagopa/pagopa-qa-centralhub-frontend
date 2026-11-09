"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { QualityGateReportView } from "@/components/nrts/QualityGateReportView";
import { Gate } from "@/lib/permissions";
import { useQualityGateRun } from "@/hooks/useQualityGate";

export default function QualityGateReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const { data: run, isLoading, isError } = useQualityGateRun(runId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {/* The list is not visible to every role: the way back is offered only to those who can open it. */}
      <Gate action="view:qg_nrts">
        <Link href="/quality-gate" className="inline-flex w-fit items-center gap-1 text-[13px] text-accent hover:underline">
          <ArrowLeft size={14} aria-hidden /> Torna alla lista
        </Link>
      </Gate>
      {isLoading && (
        <p className="flex items-center gap-2 text-[13px] text-text-muted">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Caricamento del report…
        </p>
      )}
      {isError && <p role="alert" className="text-[13px] text-danger">Report non trovato o non disponibile.</p>}
      {run && <QualityGateReportView run={run} />}
    </div>
  );
}
