"use client";

/* How the risk of a release is rated. The categories, their rating and the promotion
   threshold are read from the backend (the same rules the analysis applies), so this text
   can never drift from the code. Shared by the Impact view and the guide. */

import { useEaImpactRules } from "@/hooks/useEaMap";
import { RISK_LABEL } from "@/lib/ea-map/assist";

export function ImpactRules({ tableClass }: { tableClass?: string }) {
  const { data: rules, isPending, isError } = useEaImpactRules();
  if (isPending) return <p>Caricamento delle regole…</p>;
  if (isError || !rules) return <p role="alert">Le regole di calcolo non sono disponibili in questo momento.</p>;
  const { min_direct_callers: min, from, to } = rules.promotion;
  return (
    <>
      <p>
        Ogni file cambiato ha <b>una sola categoria</b>: vale la prima riga della tabella che combacia con il suo percorso.
        Il rischio della modifica è quello della categoria più grave presente; il numero di file e di righe cambiate non conta.
      </p>
      <table className={tableClass}>
        <thead>
          <tr><th>Categoria</th><th>File riconosciuti</th><th>Rischio della modifica</th></tr>
        </thead>
        <tbody>
          {rules.categories.map((c) => (
            <tr key={c.key}>
              <td><b>{c.label}</b></td>
              <td>{c.hint}</td>
              <td>{RISK_LABEL[c.risk]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <b>Promozione</b>: se la modifica è a rischio {RISK_LABEL[from].toLowerCase()} e il componente ha almeno{" "}
        {min} chiamanti diretti, il rischio finale diventa {RISK_LABEL[to].toLowerCase()}.
      </p>
      <p>
        <b>Elementi coinvolti</b> (fino a {rules.depth} passaggi nella mappa). Vale solo se il rischio della modifica non è
        «nessuno»: per le modifiche di soli test o documentazione non viene propagato nessun impatto.
      </p>
      <ul>
        <li>
          <b>Chi lo chiama</b>: il chiamante diretto ha lo stesso rischio della modifica; a due passaggi scende di un livello;
          oltre è basso.
        </li>
        <li>
          <b>Dati a valle</b>: alto se cambia un contratto o uno schema, medio per le altre modifiche con un solo passaggio,
          basso oltre.
        </li>
        <li>
          <b>Cosa chiama</b>: medio se cambia la configurazione, altrimenti basso.
        </li>
      </ul>
    </>
  );
}
