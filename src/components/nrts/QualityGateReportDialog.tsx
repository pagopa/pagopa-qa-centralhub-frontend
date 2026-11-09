"use client";

import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { useQualityGateRunScenarios } from "@/hooks/useQualityGate";
import type { NrtsListObject } from "@/types";
import {
  buildQualityGateReportData,
  ghaRunId,
  type QualityGateOutcome,
  type QualityGateReportData,
} from "@/utils/qualityGateReport";

const OUTCOME_CLASS: Record<QualityGateOutcome, string> = {
  GO: "bg-success-soft text-success",
  NOGO: "bg-danger-soft text-danger",
  PENDING: "bg-warning-soft text-warning",
};

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-subtle px-3 py-2">
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className={`font-mono text-xl font-semibold ${tone ?? "text-text"}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="break-words text-text">{children}</dd>
    </div>
  );
}

function DistributionBar({ data }: { data: QualityGateReportData }) {
  const { total, passed, failed, broken } = data.totals;
  const base = total > 0 ? total : 1;
  const pct = (n: number) => `${(n / base) * 100}%`;
  return (
    <div
      role="img"
      aria-label={`${passed} passed, ${failed} failed, ${broken} broken su ${total}`}
      className="flex h-2 overflow-hidden rounded-full bg-neutral-soft"
    >
      <div className="bg-success" style={{ width: pct(passed) }} />
      <div className="bg-danger" style={{ width: pct(failed) }} />
      <div className="bg-warning" style={{ width: pct(broken) }} />
    </div>
  );
}

function SectionTitle({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <h3 className={`mb-2 font-mono text-[11px] uppercase ${tone}`} style={{ letterSpacing: ".06em" }}>
      {children}
    </h3>
  );
}

interface QualityGateReportDialogProps {
  run: NrtsListObject | null;
  open: boolean;
  onClose: () => void;
}

/** Popup report of a Quality Gate run, with a button to download it as PDF. */
export function QualityGateReportDialog({ run, open, onClose }: QualityGateReportDialogProps) {
  const { data: scenarios, isLoading, isError } = useQualityGateRunScenarios(run?.test_run.id, open);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);

  if (!run) return null;
  const report = scenarios ? buildQualityGateReportData(run, scenarios) : null;

  async function handleDownload() {
    if (!report) return;
    setIsDownloading(true);
    setDownloadFailed(false);
    try {
      const { downloadQualityGateReportPdf } = await import("@/utils/qualityGateReportPdf");
      await downloadQualityGateReportPdf(report);
    } catch {
      setDownloadFailed(true);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0"
        style={{ width: "min(960px, 92vw)", maxWidth: "min(960px, 92vw)" }}
      >
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="sr-only">Report Quality Gate</DialogTitle>
          {report ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase text-text-muted" style={{ letterSpacing: ".06em" }}>
                  Quality Gate report
                </p>
                <p className="text-xl font-semibold text-text">
                  {report.suite}{" "}
                  <span className="text-[13px] font-normal text-text-dim">
                    {report.testType} · {report.environment}
                  </span>
                </p>
                <p className="text-[12px] text-text-dim">
                  {report.start} – {report.end} · durata {report.duration}
                </p>
              </div>
              <div className={`min-w-24 rounded-xl px-5 py-2 text-center ${OUTCOME_CLASS[report.outcome]}`}>
                <p className="text-[11px]">ESITO</p>
                <p className="text-2xl font-semibold leading-tight">{report.outcome}</p>
              </div>
            </div>
          ) : (
            <p className="text-base font-semibold text-text">Report Quality Gate</p>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <p className="flex items-center gap-2 text-[13px] text-text-muted">
              <Loader2 size={14} className="animate-spin" aria-hidden /> Caricamento del report…
            </p>
          )}
          {isError && <p role="alert" className="text-[13px] text-danger">Impossibile caricare il report.</p>}
          {report && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Tile label="Totale" value={String(report.totals.total)} />
                <Tile label="Passed" value={String(report.totals.passed)} tone="text-success" />
                <Tile label="Failed" value={String(report.totals.failed)} tone="text-danger" />
                <Tile label="Broken / skipped" value={`${report.totals.broken} / ${report.totals.skipped}`} />
                <Tile label="Pass rate" value={`${report.passRate.toFixed(1)}%`} />
              </div>
              <DistributionBar data={report} />

              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px] sm:grid-cols-3">
                <Field label="Tipologia">{report.testType}</Field>
                <Field label="Ambiente">{report.environment}</Field>
                <Field label="Ver. test object">{report.testObjectVersion}</Field>
                <Field label="Ver. test suite">{report.testSuiteVersion}</Field>
                <Field label="Revisore">{report.reviewer}</Field>
                <Field label="Durata">{report.duration}</Field>
                <Field label="Run GitHub Actions">
                  {report.ghaRunUrl ? (
                    <a href={report.ghaRunUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      Run #{ghaRunId(report.ghaRunUrl) ?? "—"} <ExternalLink className="inline" size={12} aria-hidden />
                    </a>
                  ) : "—"}
                </Field>
                <Field label="Report Allure">
                  {report.allureUrl ? (
                    <a href={report.allureUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      Apri <ExternalLink className="inline" size={12} aria-hidden />
                    </a>
                  ) : "—"}
                </Field>
              </dl>

              <section aria-label="Scenari KO">
                <SectionTitle tone="text-danger">Scenari KO ({report.koScenarios.length})</SectionTitle>
                {report.koScenarios.length === 0 ? (
                  <p className="text-[12px] text-text-muted">Nessuno scenario KO: tutti gli scenari eseguiti sono passati.</p>
                ) : (
                  <div className="overflow-hidden rounded-[var(--radius-sm)] border border-border text-[12px]">
                    {report.koScenarios.map((s) => (
                      <div key={s.id} className="grid grid-cols-[2fr_70px_3fr] gap-3 border-b border-border px-3 py-2 last:border-0">
                        <span className="text-text">{s.scenario_name ?? "—"}</span>
                        <span className={(s.status ?? "").toUpperCase() === "BROKEN" ? "text-warning" : "text-danger"}>
                          {(s.status ?? "").toLowerCase()}
                        </span>
                        <span className="break-words text-text-dim">{s.error_message ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section aria-label="Scenari OK">
                <SectionTitle tone="text-success">Scenari OK ({report.okScenarios.length})</SectionTitle>
                {report.okScenarios.length === 0 ? (
                  <p className="text-[12px] text-text-muted">Nessuno scenario passato.</p>
                ) : (
                  <ul className="grid gap-x-6 gap-y-1 text-[12px] text-text sm:grid-cols-2">
                    {report.okScenarios.map((s) => (
                      <li key={s.id} className="flex items-baseline justify-between gap-3">
                        <span><span className="text-success" aria-hidden>✓</span> {s.scenario_name ?? "—"}</span>
                        <span className="font-mono text-[11px] text-text-muted">
                          {s.duration_ms == null ? "" : `${s.duration_ms} ms`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {report.skippedScenarios.length > 0 && (
                <section aria-label="Scenari saltati">
                  <SectionTitle tone="text-text-muted">Scenari saltati ({report.skippedScenarios.length})</SectionTitle>
                  <ul className="grid gap-x-6 gap-y-1 text-[12px] text-text-dim sm:grid-cols-2">
                    {report.skippedScenarios.map((s) => (
                      <li key={s.id}>{s.scenario_name ?? "—"}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-subtle px-5 py-3">
          <span className="text-[11px] text-text-muted">
            {downloadFailed ? <span role="alert" className="text-danger">Impossibile generare il PDF. Riprova.</span> : "Il PDF contiene lo stesso riepilogo e le liste degli scenari."}
          </span>
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            onClick={handleDownload}
            disabled={!report || isDownloading}
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Download size={16} aria-hidden />}
            Scarica PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
