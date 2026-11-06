"use client";

/* Categories, change-risk mapping, promotion threshold and graph depth come from the backend.
   Classification and propagation notes explain behavior not represented by that endpoint. */

import { useEaImpactRules } from "@/hooks/useEaMap";
import { RISK_LABEL } from "@/lib/ea-map/assist";

export function ImpactRules({ tableClass }: { tableClass?: string }) {
  const { data: rules, isPending, isError } = useEaImpactRules();
  if (isPending) return <p>Caricamento delle regole…</p>;
  if (isError || !rules) return <p role="alert">Le regole di calcolo non sono disponibili in questo momento.</p>;
  const { min_direct_callers: min, from, to } = rules.promotion;
  return (
    <>
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
      <p>Ogni file cambiato è assegnato a una categoria secondo l’ordine della tabella.</p>
      <p><b>Rischio della modifica</b>: si applica la prima regola corrispondente:</p>
      <ul>
        {rules.change_risk.map((rule) => (
          <li key={rule.risk}>
            {RISK_LABEL[rule.risk]}:{" "}
            {rule.categories
              .map((key) => rules.categories.find((category) => category.key === key)?.label ?? key)
              .join(", ")}
          </li>
        ))}
      </ul>
      <p>
        <b>Promozione</b>: se la modifica è a rischio {RISK_LABEL[from].toLowerCase()} e il componente ha almeno{" "}
        {min} chiamanti diretti, il rischio finale diventa {RISK_LABEL[to].toLowerCase()}.
      </p>
      <p>
        <b>Elementi coinvolti</b> (fino a {rules.depth} passaggi nella mappa). Vale solo se il rischio della modifica non è
        «nessuno»: per le modifiche di soli test o documentazione non viene propagato nessun impatto. I dettagli di
        propagazione che seguono descrivono l’algoritmo attuale e sono testo mantenuto qui.
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
