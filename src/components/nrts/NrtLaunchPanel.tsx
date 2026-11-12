"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import {
  useLaunchRun,
  useNrtLaunchOptions,
  useRuns,
  type NrtRunRequest,
  type QualityGateEnvironment,
} from "@/hooks/useQualityGate";
import { RunsStatusList, launchErrorMessage, withPendingRun } from "./RunsStatusList";

const SUITE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const ENVIRONMENTS: QualityGateEnvironment[] = ["dev", "uat"];

function parseSuiteIds(text: string): string[] {
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

const ALL = "all";
const TYPED = "typed";

/** Launches the NRT workflow through the Hub backend: every suite of an environment, or a single one. */
export function NrtLaunchPanel() {
  const [environment, setEnvironment] = useState<QualityGateEnvironment>("uat");
  const [choice, setChoice] = useState<string>(ALL);
  const [typed, setTyped] = useState("");
  const [confirming, setConfirming] = useState(false);

  const launch = useLaunchRun<NrtRunRequest>("NRT");
  const launched = launch.isSuccess ? launch.data : undefined;
  const { data: listedRuns = [], isError: hasRunsError } = useRuns("NRT", launched?.correlation_id);
  const runs = withPendingRun(launched, listedRuns);

  const { data: options } = useNrtLaunchOptions();
  // When the registry could not be read the choice is not restricted: ids are typed by hand.
  const registry = options?.available ? options.suites : null;
  const offered = registry?.filter((s) => s.envs.includes(environment)) ?? [];
  // A suite chosen for another environment is not offered any more: back to "all", which asks for confirmation.
  const selection = choice === ALL || (choice === TYPED ? registry === null : offered.some((s) => s.id === choice))
    ? choice
    : ALL;
  const typedIds = parseSuiteIds(typed);
  const isAll = selection === ALL;
  const isValid = isAll || (selection === TYPED ? typedIds.length > 0 && typedIds.every((id) => SUITE_PATTERN.test(id)) : true);

  function send() {
    const suites = isAll ? ALL : selection === TYPED ? typedIds : [selection];
    launch.mutate({ suites, target_env: environment });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid || launch.isPending) return;
    if (isAll) setConfirming(true);
    else send();
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Lancia NRT"
      className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-4"
    >
      <p className="font-mono uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: ".06em" }}>
        Lancia NRT
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-dim">
          Suite
          <select className={`${SELECT_CLASS} min-w-44`} value={selection} onChange={(e) => setChoice(e.target.value)}>
            <option value={ALL}>Tutte le suite</option>
            {offered.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
            {registry === null && <option value={TYPED}>Digita gli id…</option>}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-dim">
          Ambiente
          <select className={SELECT_CLASS} value={environment} onChange={(e) => setEnvironment(e.target.value as QualityGateEnvironment)}>
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </label>
        {selection === TYPED && (
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-dim">
            Id delle suite (separati da virgola)
            <input className={INPUT_CLASS} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="es. wisp, checkout" />
          </label>
        )}
        <button type="submit" disabled={!isValid || launch.isPending} className={PRIMARY_BUTTON_CLASS}>
          {launch.isPending ? "Avvio…" : "Lancia"}
        </button>
      </div>
      {selection === TYPED && (
        <p className="text-[13px] text-text-muted">
          Elenco delle suite non disponibile: l&apos;esistenza degli id viene verificata dal workflow.
        </p>
      )}
      {registry && offered.length === 0 && (
        <p className="text-[13px] text-text-muted">Nessuna suite configurata per questo ambiente.</p>
      )}
      <RunsStatusList runs={runs} label="Run NRT recenti" />
      {hasRunsError && (
        <p className="text-[13px] text-text-muted">Stato delle run non disponibile, riprovo…</p>
      )}
      {launch.isError && (
        <p role="alert" className="text-[13px] text-danger">{launchErrorMessage(launch.error, "gli NRT")}</p>
      )}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lanciare tutte le suite NRT su {environment}?</DialogTitle>
            <DialogDescription>
              Verranno eseguite tutte le suite configurate per questo ambiente: l&apos;esecuzione può richiedere a lungo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setConfirming(false)}>
              Annulla
            </button>
            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => { setConfirming(false); send(); }}>
              Conferma
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
