"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { QualityGateReportView } from "@/components/nrts/QualityGateReportView";
import { Gate } from "@/lib/permissions";
import { useRunReport } from "@/hooks/useQualityGate";
import type { RunReportKind } from "@/utils/qualityGateReport";

interface RunReportPageProps {
  kind: RunReportKind;
  /** The runs list this report belongs to, and the permission needed to open it. */
  listHref: string;
  listAction: string;
}

/** Shareable report of a single run (Quality Gate, TAS or NRT), opened from a link. */
export function RunReportPage({ kind, listHref, listAction }: RunReportPageProps) {
  const { runId } = useParams<{ runId: string }>();
  const { data: run, isLoading, isError } = useRunReport(kind, runId);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {/* The list is not visible to every role: the way back is offered only to those who can open it. */}
      <Gate action={listAction}>
        <Link href={listHref} className="inline-flex w-fit items-center gap-1 text-[13px] text-accent hover:underline">
          <ArrowLeft size={14} aria-hidden /> Torna alla lista
        </Link>
      </Gate>
      {isLoading && (
        <p className="flex items-center gap-2 text-[13px] text-text-muted">
          <Loader2 size={14} className="animate-spin" aria-hidden /> Caricamento del report…
        </p>
      )}
      {isError && <p role="alert" className="text-[13px] text-danger">Report non trovato o non disponibile.</p>}
      {run && <QualityGateReportView run={run} kind={kind} />}
    </div>
  );
}
