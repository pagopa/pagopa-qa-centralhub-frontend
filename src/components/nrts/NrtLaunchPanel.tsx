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

/** Launches the NRT workflow through the Hub backend: every suite of an environment, or a selection. */
export function NrtLaunchPanel() {
  const [environment, setEnvironment] = useState<QualityGateEnvironment>("uat");
  const [all, setAll] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
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
  // A selection made for another environment must not be sent for this one.
  const effective = registry ? selected.filter((id) => offered.some((s) => s.id === id)) : parseSuiteIds(typed);
  const typedValid = registry !== null || effective.every((id) => SUITE_PATTERN.test(id));
  const isValid = all || (effective.length > 0 && typedValid);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function send() {
    launch.mutate({ suites: all ? "all" : effective, target_env: environment });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid || launch.isPending) return;
    if (all) setConfirming(true);
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
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-dim">
          Ambiente
          <select className={SELECT_CLASS} value={environment} onChange={(e) => setEnvironment(e.target.value as QualityGateEnvironment)}>
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 text-[13px] font-medium text-text-dim">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={all} onChange={(e) => setAll(e.target.checked)} />
          Tutte le suite
        </label>
        <button type="submit" disabled={!isValid || launch.isPending} className={PRIMARY_BUTTON_CLASS}>
          {launch.isPending ? "Avvio…" : "Lancia"}
        </button>
      </div>
      {!all && registry && (
        <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
          <legend className="sr-only">Suite da lanciare</legend>
          {offered.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-[13px] text-text-dim">
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
              {s.label}
            </label>
          ))}
          {offered.length === 0 && (
            <p className="text-[13px] text-text-muted">Nessuna suite configurata per questo ambiente.</p>
          )}
        </fieldset>
      )}
      {!all && !registry && (
        <label className="flex max-w-md flex-col gap-1 text-[13px] font-medium text-text-dim">
          Suite (id separati da virgola)
          <input className={INPUT_CLASS} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="es. wisp, checkout" />
          <span className="font-normal text-text-muted">Elenco delle suite non disponibile: l&apos;esistenza degli id viene verificata dal workflow.</span>
        </label>
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
