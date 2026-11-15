"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function FlakyHowItWorksContent() {
  return (
    <>
      <p>
        <strong>Run considerate:</strong> run NRT schedulate e run TAS, escluse le run manuali e le Quality Gate
        (che verificano una release candidate, dove un KO è di solito una regressione). Per ambiente, negli ultimi
        30 giorni e al massimo 30 run per scenario. Gli scenari SKIPPED non contano.
      </p>
      <p>
        <strong>Flip rate:</strong> quante volte l&apos;esito passa da OK a KO o viceversa tra run consecutive.
        <br />
        <strong>Pass on retry:</strong> quota di esecuzioni passate solo dopo un retry.
        <br />
        Le run recenti pesano di più: il peso si dimezza ogni 14 giorni.
      </p>
      <p>
        <strong>Punteggio</strong> 0–100 = il maggiore dei due segnali. <strong>Livelli</strong> da 1 a 5 con
        soglie 5 / 15 / 30 / 50. Con meno di 5 run: dati insufficienti.
      </p>
      <p>
        <strong>Da marcare:</strong> livello 4–5 senza flag. <strong>Da smarcare:</strong> con flag ma livello 1
        su almeno 10 run. <strong>Rotto:</strong> fallito in tutte le ultime 5 run, è un bug e non un flaky.
      </p>
      <p className="text-text-dim">Ricalcolo automatico ogni giorno alle 12:00.</p>
    </>
  );
}

export function FlakyHowItWorks() {
  return (
    <Popover>
      <PopoverTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-text">
        <Info className="size-4" aria-hidden="true" />
        Come si calcola
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 gap-2 text-xs leading-relaxed">
        <FlakyHowItWorksContent />
      </PopoverContent>
    </Popover>
  );
}
