import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { LifecycleDiagram } from "@/components/test-lifecycle/LifecycleDiagram";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[16px] font-semibold text-text">{title}</h2>
      <div className="flex flex-col gap-2 text-[14px] leading-relaxed text-text-dim">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="list-decimal pl-5 flex flex-col gap-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function Code({ children }: { children: string }) {
  return <code className="font-mono text-[12.5px] rounded px-1 py-0.5 bg-[var(--neutral-soft)] text-text">{children}</code>;
}

const ROLES: [string, string][] = [
  ["QA Analyst (owner di progettazione)", "Crea la feature, scrive scenari e Contesto, la invia in review."],
  ["Reviewer", "Commenta, richiede modifiche o approva. Non può essere l'owner della feature."],
  ["QA Engineer (owner di implementazione)", "Lavora sul feature file su GitHub dopo l'approvazione e completa gli step."],
  ["Team QA su GitHub (CODEOWNERS)", "Rivede la PR aperta dall'hub e fa il merge."],
  ["Chi gestisce Git (permesso manage:tl_git)", "Lancia \"Sincronizza ora\", riprova le PR fallite, gestisce le anomalie."],
];

export default function TestLifecycleGuidePage() {
  return (
    <div className="flex flex-col gap-7 max-w-4xl">
      <Link href="/test-lifecycle" className="flex items-center gap-1 text-[13px] text-text-muted hover:text-text w-fit">
        <ChevronLeft size={14} /> Test Lifecycle
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text">Guida al Test Lifecycle</h1>
        <p className="text-[14px] text-text-dim">
          Come si progetta una feature di test nell&apos;hub e come arriva, attraverso una PR, nel repository dei test
          su GitHub. L&apos;hub sostituisce le pagine Confluence &quot;Testing Suites&quot;.
        </p>
      </div>

      <Section title="Il processo in breve">
        <LifecycleDiagram />
        <p>
          Nell&apos;hub si progetta e si revisiona; su GitHub si fa il merge. L&apos;hub crea la PR da solo quando la
          revisione viene approvata, e si accorge del merge al sync successivo (automatico ogni 5 minuti oppure con
          &quot;Sincronizza ora&quot;). Gli unici passi manuali sono: scrivere, inviare, approvare, fare il merge.
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Bozza</strong>: la feature si modifica liberamente.</li>
          <li><strong>In review</strong>: la bozza è bloccata, il reviewer la valuta.</li>
          <li><strong>Progettata</strong>: la revisione è approvata e la PR è aperta su GitHub.</li>
          <li><strong>Implementata</strong>: il feature file è su <Code>main</Code> e coerente con la progettazione.</li>
          <li><strong>In esecuzione</strong>: gli scenari girano negli NRT (arriverà con l&apos;integrazione NRT).</li>
        </ul>
      </Section>

      <Section title="Chi fa cosa">
        <table className="w-full text-[13px] border-collapse">
          <tbody>
            {ROLES.map(([role, what]) => (
              <tr key={role} className="border-b border-border align-top">
                <td className="py-1.5 pr-4 font-medium text-text whitespace-nowrap">{role}</td>
                <td className="py-1.5">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="1. Preparare l'ambito">
        <p>Una sola volta per ogni ambito (es. Checkout, FdR3, CUP), da chi ha il permesso di gestire gli ambiti.</p>
        <Steps
          items={[
            <>Nella pagina Test Lifecycle clicca <strong>Gestisci ambiti</strong>.</>,
            <>Inserisci il <strong>codice</strong> (es. <Code>FdR3</Code>): diventa parte dei codici FEAT e dei tag (<Code>@FDR3_001_01</Code>) e non si può più cambiare quando esistono feature.</>,
            <>Indica la <strong>cartella nel repository</strong> dove andranno i feature file (es. <Code>src/integration/fdr/features</Code>). Senza cartella non si può inviare in review.</>,
            <>Collega l&apos;<strong>Epic QA</strong>: cercala per nome tra le Epic esistenti del progetto PQ, scrivi la chiave, oppure clicca <strong>Crea Epic QA</strong> (crea <Code>[QA Epic] &lt;nome ambito&gt;</Code> su Jira). Indica anche il <strong>componente Jira</strong>. Sono i valori di default dei task Jira delle feature.</>,
          ]}
        />
      </Section>

      <Section title="2. Progettare la feature">
        <Steps
          items={[
            <>Clicca <strong>Nuova feature</strong>, scegli l&apos;ambito e il titolo. Il codice (<Code>FEAT_001_FdR3</Code>) lo assegna l&apos;hub.</>,
            <>Compila i metadati: reviewer, Epic/Story di prodotto oppure &quot;reverse engineering&quot;, requisiti e stime. Il task Jira di progettazione lo crea l&apos;hub dal tab <strong>Jira</strong> (vedi sotto), oppure ne scrivi la chiave se esiste già.</>,
            <>Scrivi il <strong>Contesto</strong> (solo step <Code>Dato</Code>/<Code>E</Code>) e aggiungi gli <strong>scenari</strong>. Tag e numero dello scenario li gestisce l&apos;hub; tu scrivi titolo, tipo, polarità e step.</>,
            <>Gli step si scrivono in Gherkin italiano (<Code>Dato</Code>, <Code>Quando</Code>, <Code>Allora</Code>, <Code>E</Code>, <Code>Ma</Code>). Gli errori compaiono mentre scrivi, riga per riga.</>,
            <>Mentre scrivi uno step l&apos;editor <strong>suggerisce le frasi già usate nel repository</strong>: quelle marcate &quot;implementato&quot; hanno già una step definition. Riusarle fa risparmiare lavoro al QA Engineer. Si sceglie con ↑/↓ e Invio, si chiude con Esc.</>,
            <>Per uno <strong>Schema dello scenario</strong> compila la tabella Esempi: ogni <Code>&lt;segnaposto&gt;</Code> negli step deve avere la sua colonna.</>,
            <>Il tab <strong>Anteprima file</strong> mostra il feature file esattamente come finirà su GitHub.</>,
            <>Quando i motivi di blocco sotto <strong>Invia in review</strong> sono spariti, invia.</>,
          ]}
        />
        <p>
          Se due persone modificano la stessa bozza, la seconda vede l&apos;avviso &quot;La bozza è stata modificata da un
          altro utente&quot;: va ricaricata la pagina prima di continuare, così nessuno sovrascrive il lavoro dell&apos;altro.
        </p>
      </Section>

      <Section title="3. Review">
        <Steps
          items={[
            <>Il reviewer apre la feature e usa il tab <strong>Review</strong> per commentare la feature o un singolo scenario (pulsante &quot;Commenta&quot; sulla scheda).</>,
            <><strong>Richiedi modifiche</strong> (con una nota obbligatoria) riporta la feature in bozza all&apos;owner.</>,
            <><strong>Approva</strong> chiude la progettazione: la revisione viene salvata nello Storico e l&apos;hub apre la PR.</>,
          ]}
        />
        <p>Durante la review si può cambiare solo il reviewer; owner e chiave Jira si modificano solo in bozza.</p>
      </Section>

      <Section title="4. PR e merge su GitHub">
        <Steps
          items={[
            <>All&apos;approvazione l&apos;hub crea il branch <Code>qa-hub/&lt;codice&gt;-r&lt;revisione&gt;</Code>, ci scrive il feature file e apre la PR verso <Code>main</Code>. Il link è nel tab <strong>Git</strong>.</>,
            <>Se la creazione fallisce (GitHub non raggiungibile, permessi), nel tab Git compare l&apos;errore e il pulsante <strong>Riprova PR</strong>: non crea mai PR doppie.</>,
            <>Il QA Engineer completa gli step su quel branch se serve, il team QA rivede la PR e fa il <strong>merge</strong> su GitHub.</>,
            <>Al sync successivo l&apos;hub legge il file su <Code>main</Code>: la feature diventa <strong>Implementata</strong>. Se il file è illeggibile o non coerente, resta Progettata e si apre un&apos;anomalia.</>,
          ]}
        />
        <p>Il nome del file viene fissato alla prima PR e non cambia se poi cambia il titolo.</p>
      </Section>

      <Section title="5. Modifiche fatte direttamente su Git">
        <p>
          Chi modifica il feature file direttamente su GitHub non perde nulla: l&apos;hub, al sync, salva la nuova versione
          nello Storico (origine &quot;Git&quot;) e la mostra come versione pubblicata.
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Modifiche di testo</strong> (step, titoli, esempi, descrizione): accettate senza segnalazioni.</li>
          <li><strong>Modifiche strutturali</strong> (tag di uno scenario tolto o cambiato, scenario eliminato, header <Code># qa-hub:</Code> rimosso): accettate ma segnalate come anomalia da verificare.</li>
          <li><strong>Nuovo scenario con un tag valido</strong>: l&apos;hub lo registra e chiede di riconoscerlo.</li>
          <li><strong>File spostato o rinominato</strong> con lo stesso header: l&apos;hub aggiorna il percorso da solo.</li>
        </ul>
        <p>
          Una GitHub Action sul repository controlla le convenzioni (header, lingua, tag univoci) sulle PR che toccano i
          feature file gestiti dall&apos;hub.
        </p>
      </Section>

      <Section title="6. Riaprire e riallineare">
        <Steps
          items={[
            <>Per cambiare una feature già implementata clicca <strong>Riapri</strong>: nasce una nuova bozza copiata dalla versione pubblicata; la feature resta Implementata finché la nuova revisione non arriva su <Code>main</Code>.</>,
            <>Se nel frattempo qualcuno modifica il file su GitHub, la bozza viene segnata <strong>Base superata</strong> e non si può inviare in review.</>,
            <>Clicca <strong>Riallinea</strong>: per ogni elemento vedi tre colonne (Base, Git, Bozza). Le modifiche fatte da una sola parte si applicano da sole; dove hanno cambiato entrambi scegli <strong>Usa Git</strong> o <strong>Mantieni bozza</strong>.</>,
            <>Dopo il riallineamento si invia e si approva come sempre; l&apos;hub aggiorna la stessa PR.</>,
          ]}
        />
      </Section>

      <Section title="Jira">
        <p>L&apos;hub crea e collega i task Jira del progetto PQ, così non vanno aperti a mano.</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Progettazione</strong> (&quot;Progettazione Scenari e casi di test&quot;): si crea dal tab Jira con <strong>Crea task Progettazione</strong>, mentre la feature è in bozza.</li>
          <li><strong>Implementazione</strong> (&quot;Implementazione suite di TA&quot;): l&apos;hub la crea da solo all&apos;approvazione. Se Jira non risponde compare l&apos;errore e il pulsante <strong>Riprova task Implementazione</strong>.</li>
          <li>Ogni task ha etichetta <Code>testing</Code>, sta sotto l&apos;Epic QA (quella dell&apos;ambito, o quella indicata nella feature), ha il componente dell&apos;ambito, è assegnato all&apos;owner della fase ed è collegato (&quot;relates to&quot;) all&apos;Epic/Story di prodotto.</li>
          <li>Se un task con lo stesso titolo esiste già, l&apos;hub lo ricollega invece di crearne un doppione.</li>
          <li>Le chiavi scritte a mano vengono verificate su Jira. Lo stato dei task (Da fare, In corso, Fatto) si aggiorna da solo ogni 15 minuti, o subito con <strong>Aggiorna da Jira</strong>.</li>
        </ul>
      </Section>

      <Section title="NRT">
        <p>
          L&apos;hub collega ogni scenario alle esecuzioni NRT tramite il suo <strong>tag</strong> (es.{" "}
          <Code>@FDR3_001_01</Code>): non serve configurare nulla, basta che la run contenga lo scenario con il suo tag.
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Il tab <strong>NRT</strong> della feature mostra, per ogni scenario, l&apos;ultimo esito per ambiente (con link al report Allure), il pass rate sulle ultime 10 run e il segnale <strong>Flaky</strong>.</li>
          <li>Alla prima esecuzione di uno scenario, una feature <strong>Implementata</strong> diventa <strong>In esecuzione</strong> da sola, e non torna indietro.</li>
          <li>Dal report di una run NRT, TAS o Quality Gate, la sezione <strong>Feature collegate</strong> porta alle feature eseguite.</li>
          <li>Nella panoramica, ogni ambito mostra il pass rate NRT complessivo dei suoi scenari.</li>
          <li>Se cambi il tag di uno scenario a mano su Git, le esecuzioni non vengono più collegate: i tag li gestisce l&apos;hub.</li>
        </ul>
      </Section>

      <Section title="Anomalie">
        <p>
          Le anomalie sono le situazioni che richiedono una persona: modifiche strutturali, file illeggibili o
          eliminati, PR chiuse senza merge, creazione della PR fallita. Le trovi nel tab Git della feature e, tutte
          insieme, nella <Link href="/test-lifecycle/anomalie" className="text-[var(--accent)] hover:underline">pagina Anomalie</Link>.
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Presa visione</strong>: qualcuno se ne sta occupando.</li>
          <li><strong>Risolta</strong>: il problema è sistemato. Una feature mergiata diventa Implementata quando non restano anomalie strutturali, di file illeggibile o di file eliminato.</li>
        </ul>
      </Section>

      <Section title="Domande frequenti">
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="font-medium text-text">Posso approvare una feature che ho scritto io?</dt>
            <dd>No: il reviewer deve essere una persona diversa dall&apos;owner di progettazione.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">Devo creare io il branch o la PR?</dt>
            <dd>No, li crea l&apos;hub all&apos;approvazione. Su GitHub serve solo la review e il merge.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">Ho fatto il merge ma la feature è ancora Progettata.</dt>
            <dd>Aspetta il sync automatico o clicca &quot;Sincronizza ora&quot;. Se resta Progettata, controlla le anomalie nel tab Git.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">Posso modificare i tag @… a mano su GitHub?</dt>
            <dd>Meglio di no: i tag collegano lo scenario alla progettazione e ai risultati NRT. Se li cambi, l&apos;hub apre un&apos;anomalia.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">I feature file già esistenti su GitHub compaiono nell&apos;hub?</dt>
            <dd>Non ancora: l&apos;hub gestisce i file con l&apos;header <Code># qa-hub:</Code>. L&apos;importazione dei file esistenti arriverà più avanti.</dd>
          </div>
        </dl>
      </Section>
    </div>
  );
}
