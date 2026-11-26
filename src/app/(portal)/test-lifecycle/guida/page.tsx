"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { ExampleFlow, Mono } from "@/components/test-lifecycle/ExampleFlow";
import { LifecycleDiagram } from "@/components/test-lifecycle/LifecycleDiagram";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

function FileSample({ title, children }: { title: string; children: string }) {
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="text-[12px] text-text-muted">{title}</figcaption>
      <pre className="overflow-x-auto rounded-[var(--radius-sm)] border border-border bg-[var(--bg)] p-3 font-mono text-[12px] leading-relaxed text-text">
        {children}
      </pre>
    </figure>
  );
}

const ROLES: [string, string][] = [
  ["QA Analyst (owner di progettazione)", "Crea la feature, scrive scenari e Contesto, la invia in review."],
  ["Reviewer", "Commenta, richiede modifiche o approva. Non può essere l'owner della feature."],
  ["QA Engineer (owner di implementazione)", "Lavora sul feature file su GitHub dopo l'approvazione e completa gli step."],
  ["Team QA su GitHub (CODEOWNERS)", "Rivede la PR aperta dall'hub e fa il merge."],
  ["Chi gestisce Git (permesso manage:tl_git)", "Lancia \"Sincronizza ora\", riprova le PR fallite, gestisce le anomalie."],
  ["Chi migra (permesso manage:tl_migration)", "Usa la pagina Migrazione per portare nell'hub le pagine Confluence."],
];

const TABS = [
  { value: "panoramica", label: "Panoramica" },
  { value: "progettazione", label: "Progettazione" },
  { value: "git", label: "Git" },
  { value: "jira", label: "Jira" },
  { value: "nrt", label: "NRT" },
  { value: "migrazione", label: "Migrazione" },
  { value: "faq", label: "Domande frequenti" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const isTab = (value: string): value is TabValue => TABS.some((t) => t.value === value);

const HUB_FILE = `# language: it
# qa-hub: FEAT_011_FdR3
@FDR3_011 @integration
Funzionalità: Recupero FdR pubblicati per organizzazione

  Contesto:
    Dato che i sistemi sono operativi

  @FDR3_011_01 @runnable @positive
  Scenario: Recupero di tutti i FdR pubblicati
    Quando l'organizzazione invia la richiesta di recupero
    Allora l'organizzazione riceve il codice di stato HTTP 200`;

function Overview() {
  return (
    <>
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
          <li><strong>In esecuzione</strong>: almeno uno scenario è stato eseguito da una run NRT (vedi tab NRT).</li>
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
    </>
  );
}

function Design() {
  return (
    <>
      <Section title="1. Preparare l'ambito">
        <p>Una sola volta per ogni ambito (es. Checkout, FdR3, CUP), da chi ha il permesso di gestire gli ambiti.</p>
        <Steps
          items={[
            <>Nella pagina Test Lifecycle clicca <strong>Gestisci ambiti</strong>.</>,
            <>Inserisci il <strong>codice</strong> (es. <Code>FdR3</Code>): diventa parte dei codici FEAT e dei tag (<Code>@FDR3_001_01</Code>) e non si può più cambiare quando esistono feature.</>,
            <>Indica la <strong>cartella nel repository</strong> dove andranno i feature file (es. <Code>src/integration/fdr3/feature</Code>). Senza cartella non si può inviare in review.</>,
            <>Collega l&apos;<strong>Epic QA</strong> (cercala per nome o clicca <strong>Crea Epic QA</strong>, disponibile dopo il primo salvataggio) e il <strong>componente Jira</strong>: sono i valori di default dei task Jira delle feature.</>,
          ]}
        />
      </Section>
      <Section title="2. Progettare la feature">
        <Steps
          items={[
            <>Clicca <strong>Nuova feature</strong>, scegli l&apos;ambito e il titolo. Il codice (<Code>FEAT_001_FdR3</Code>) lo assegna l&apos;hub.</>,
            <>Compila i metadati: reviewer, Epic/Story di prodotto oppure &quot;reverse engineering&quot;, requisiti e stime. Il task Jira di progettazione lo crea l&apos;hub dal tab <strong>Jira</strong>.</>,
            <>Scrivi il <strong>Contesto</strong> (solo step <Code>Dato</Code>/<Code>E</Code>) e aggiungi gli <strong>scenari</strong>. Tag e numero dello scenario li gestisce l&apos;hub; tu scrivi titolo, tipo, polarità e step e scegli i tag: il <strong>test type</strong> del file (<Code>@integration</Code>, <Code>@e2e</Code> o <Code>@api</Code>) e, per ogni scenario, <strong>uno</strong> stato tra <Code>@runnable</Code>, <Code>@skip</Code> e <Code>@broken</Code>. <Code>@flaky</Code> e i tag liberi sono facoltativi. Senza test type e stato la feature non parte in review.</>,
            <>Gli step si scrivono in Gherkin italiano (<Code>Dato</Code>, <Code>Quando</Code>, <Code>Allora</Code>, <Code>E</Code>, <Code>Ma</Code>). Gli errori compaiono mentre scrivi, riga per riga, e l&apos;editor suggerisce le frasi già usate nel repository (↑/↓ e Invio).</>,
            <>Per uno <strong>Schema dello scenario</strong> scegli il tipo e compila la tabella Esempi: ogni <Code>&lt;segnaposto&gt;</Code> negli step deve avere la sua colonna.</>,
            <>Il tab <strong>Anteprima file</strong> mostra il feature file esattamente come finirà su GitHub. Quando i motivi di blocco sotto <strong>Invia in review</strong> sono spariti, invia.</>,
          ]}
        />
        <FileSample title="Esempio: il file che l'hub genera (intestazione e tag li scrive l'hub)">{HUB_FILE}</FileSample>
        <p>
          <Code># qa-hub:</Code> lega il file alla feature, <Code>@FDR3_011_01</Code> è il tag identità dello scenario
          (non cambia mai), <Code>@integration</Code> è il test type del file, <Code>@runnable</Code> è lo stato dello scenario usato dalle run, <Code>@positive</Code> è la polarità.
        </p>
      </Section>
      <Section title="Importa da Git">
        <p>
          Se il feature file esiste già sul repository (anche su un branch di lavoro), non serve riscriverlo: crea la
          feature nell&apos;hub, poi nel tab <strong>Scenari</strong> clicca <strong>Importa da Git</strong> e incolla il link
          del file.
        </p>
        <ExampleFlow
          title="Esempio: importare FEAT_011 da un branch"
          steps={[
            { place: "GitHub", title: "Il file è su un branch", example: <Mono>PQ-827-fdr-e2e-test-design / …/FEAT_011_FdR3_….feature</Mono> },
            { place: "QA Hub", title: "Importa da Git nella bozza", example: <>Contesto e 3 scenari; tag <Mono>@fdr3_011_01</Mono> → <Mono>@FDR3_011_01</Mono> (il vecchio resta come alias)</> },
            { place: "QA Hub", title: "Review e approvazione", example: "Come per ogni feature" },
            { place: "GitHub", title: "PR dell'hub verso main", example: <>Stesso percorso del file importato, con <Mono># qa-hub:</Mono></> },
            { place: "GitHub", title: "PR di pulizia verso il branch", example: "Toglie il file dal branch di partenza, così le due PR non vanno in conflitto" },
          ]}
        />
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Il titolo della feature resta quello dell&apos;hub; Contesto, descrizione e scenari arrivano dal file.</li>
          <li>Se la bozza ha già scenari, l&apos;hub chiede conferma e li sostituisce.</li>
          <li>I tag degli scenari restano tutti, anche quelli liberi; vengono elencati come &quot;non importati&quot; solo quelli che l&apos;hub non può salvare (nomi non validi) e i tag di feature fuori catalogo. Un <Code>@integration</Code>, <Code>@e2e</Code> o <Code>@api</Code> in testa al file diventa il test type.</li>
          <li>Se il file veniva da <Code>main</Code> non serve la PR di pulizia. Se non è stato possibile crearla, nel tab Git c&apos;è &quot;Riprova&quot;.</li>
        </ul>
      </Section>
      <Section title="3. Review">
        <Steps
          items={[
            <>Il reviewer apre la feature e usa il tab <strong>Review</strong> per commentare la feature o un singolo scenario (pulsante &quot;Commenta&quot; sulla scheda).</>,
            <><strong>Richiedi modifiche</strong> (con una nota obbligatoria) riporta la feature in bozza all&apos;owner.</>,
            <><strong>Approva</strong> chiude la progettazione: la revisione viene salvata nello Storico, l&apos;hub apre la PR e crea il task Jira di implementazione.</>,
            <><strong>Ritira in bozza</strong>: finché la revisione è in review, l&apos;owner di progettazione può ritirare l&apos;invio e tornare in bozza, senza nota.</>,
            <><strong>Riporta in review</strong>: dopo l&apos;approvazione, e finché la PR non è stata mergiata, il reviewer può ritirare l&apos;approvazione. La PR su GitHub resta aperta con la versione approvata in precedenza: non mergiarla finché la revisione non è di nuovo approvata. Alla nuova approvazione l&apos;hub aggiorna la stessa PR, senza crearne un&apos;altra né un altro task Jira.</>,
          ]}
        />
        <p>Durante la review si può cambiare solo il reviewer; owner e chiave Jira si modificano solo in bozza.</p>
      </Section>
    </>
  );
}

function GitTab() {
  return (
    <>
      <Section title="4. PR e merge su GitHub">
        <ExampleFlow
          title="Esempio: dall'approvazione a Implementata"
          steps={[
            { place: "QA Hub", title: "Approva", example: "FEAT_011_FdR3 revisione 1" },
            { place: "GitHub", title: "L'hub apre la PR", example: <>Branch <Mono>qa-hub/FEAT_011_FdR3-r1</Mono> → <Mono>main</Mono></> },
            { place: "GitHub", title: "Review e merge del team", example: "CODEOWNERS" },
            { place: "QA Hub", title: "Sync", example: "Ogni 5 minuti o \"Sincronizza ora\"" },
            { place: "QA Hub", title: "Implementata", example: "Il file su main è la versione pubblicata" },
          ]}
        />
        <Steps
          items={[
            <>Se la creazione della PR fallisce (GitHub non raggiungibile, permessi), nel tab Git compare l&apos;errore e il pulsante <strong>Riprova PR</strong>: non crea mai PR doppie.</>,
            <>Il QA Engineer completa gli step su quel branch se serve, il team QA rivede la PR e fa il <strong>merge</strong>.</>,
            <>Se il file su <Code>main</Code> è illeggibile o non coerente, la feature resta Progettata e si apre un&apos;anomalia.</>,
          ]}
        />
        <p>Il nome del file viene fissato alla prima PR e non cambia se poi cambia il titolo.</p>
      </Section>
      <Section title="5. Modifiche fatte direttamente su Git">
        <ExampleFlow
          title="Esempio: qualcuno modifica il file su main"
          steps={[
            { place: "GitHub", title: "Commit su main", example: "Cambia uno step dello scenario 02" },
            { place: "QA Hub", title: "Sync", example: "Confronta il file con la versione pubblicata" },
            { place: "QA Hub", title: "Nuova versione \"Git\"", example: "Modifica di testo: nessuna segnalazione" },
            { place: "QA Hub", title: "Oppure anomalia", example: <>Tag <Mono>@FDR3_011_02</Mono> tolto: modifica strutturale da verificare</> },
          ]}
        />
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Modifiche di testo</strong> (step, titoli, esempi, descrizione): accettate senza segnalazioni.</li>
          <li><strong>Modifiche strutturali</strong> (tag di uno scenario tolto o cambiato, scenario eliminato, header <Code># qa-hub:</Code> rimosso): accettate ma segnalate come anomalia.</li>
          <li><strong>Nuovo scenario con un tag valido</strong>: l&apos;hub lo registra e chiede di riconoscerlo.</li>
          <li><strong>File spostato o rinominato</strong> con lo stesso header: l&apos;hub aggiorna il percorso da solo.</li>
        </ul>
        <p>Una GitHub Action sul repository controlla le convenzioni (header, lingua, tag univoci) sulle PR che toccano i feature file gestiti dall&apos;hub.</p>
      </Section>
      <Section title="6. Riaprire e riallineare">
        <Steps
          items={[
            <>Per cambiare una feature già implementata clicca <strong>Riapri</strong>: nasce una nuova bozza copiata dalla versione pubblicata; la feature resta Implementata finché la nuova revisione non arriva su <Code>main</Code>.</>,
            <>Ogni modifica ha il suo task Jira: la nuova revisione parte senza task di progettazione, che si crea con <strong>Crea task</strong> accanto al campo oppure si inserisce se l&apos;hai già aperto (basta anche l&apos;URL). L&apos;Epic QA resta quella di prima, ma puoi cambiarla. Nel tab <strong>Jira</strong> trovi lo storico di task ed Epic, revisione per revisione.</>,
            <>Se nel frattempo qualcuno modifica il file su GitHub, la bozza viene segnata <strong>Base superata</strong> e non si può inviare in review.</>,
            <>Clicca <strong>Riallinea</strong>: per ogni elemento vedi tre colonne (Base, Git, Bozza). Le modifiche fatte da una sola parte si applicano da sole; dove hanno cambiato entrambi scegli <strong>Usa Git</strong> o <strong>Mantieni bozza</strong>.</>,
            <>Dopo il riallineamento si invia e si approva come sempre; l&apos;hub aggiorna la stessa PR.</>,
          ]}
        />
      </Section>
      <Section title="Anomalie">
        <p>
          Le anomalie sono le situazioni che richiedono una persona: modifiche strutturali, file illeggibili o
          eliminati, PR chiuse senza merge, creazione della PR o del task Jira fallita. Le trovi nel tab Git della
          feature e, tutte insieme, nella <Link href="/test-lifecycle/anomalie" className="text-[var(--accent)] hover:underline">pagina Anomalie</Link>.
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Presa visione</strong>: qualcuno se ne sta occupando.</li>
          <li><strong>Risolta</strong>: il problema è sistemato. Una feature mergiata diventa Implementata quando non restano anomalie strutturali, di file illeggibile o di file eliminato.</li>
        </ul>
      </Section>
    </>
  );
}

function JiraTab() {
  return (
    <Section title="Jira">
      <p>L&apos;hub crea e collega i task Jira del progetto PQ, così non vanno aperti a mano.</p>
      <ExampleFlow
        title="Esempio: i task Jira di una feature"
        steps={[
          { place: "QA Hub", title: "Ambito con Epic QA", example: <>FdR3 → <Mono>PQ-500</Mono> «[QA Epic] FdR3»</> },
          { place: "Jira", title: "Bozza: Crea task Progettazione", example: <><Mono>PQ-501</Mono> «[FEAT_011_FdR3] Progettazione — …», figlio di PQ-500</> },
          { place: "QA Hub", title: "Approvazione", example: "Il reviewer approva" },
          { place: "Jira", title: "Task Implementazione automatico", example: <><Mono>PQ-502</Mono>, assegnato all&apos;owner di implementazione</> },
          { place: "QA Hub", title: "Stati aggiornati", example: "Ogni 15 minuti o \"Aggiorna da Jira\"" },
        ]}
      />
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li><strong>Progettazione</strong> (&quot;Progettazione Scenari e casi di test&quot;): si crea dal tab Jira mentre la feature è in bozza; serve per inviare in review.</li>
        <li><strong>Implementazione</strong> (&quot;Implementazione suite di TA&quot;): la crea l&apos;hub all&apos;approvazione. Se Jira non risponde compare l&apos;errore e il pulsante <strong>Riprova task Implementazione</strong>.</li>
        <li>Ogni task ha etichetta <Code>testing</Code>, sta sotto l&apos;Epic QA (dell&apos;ambito, o quella indicata nella feature), ha il componente dell&apos;ambito ed è collegato (&quot;relates to&quot;) all&apos;Epic/Story di prodotto.</li>
        <li>Se un task con lo stesso titolo esiste già, l&apos;hub lo ricollega invece di crearne un doppione. Le chiavi scritte a mano vengono verificate su Jira.</li>
      </ul>
    </Section>
  );
}

function NrtTab() {
  return (
    <Section title="Come una feature si collega agli NRT">
      <p>
        Il collegamento passa dal <strong>tag identità dello scenario</strong>: l&apos;hub lo assegna, finisce nel feature
        file, la run lo porta nel report Allure e l&apos;hub lo ritrova nelle esecuzioni. Nessuno deve configurare nulla.
      </p>
      <ExampleFlow
        title="Esempio: lo scenario 01 di FEAT_011_FdR3 eseguito in UAT"
        steps={[
          { place: "QA Hub", title: "Scenario con il suo tag", example: <Mono>@FDR3_011_01</Mono> },
          { place: "GitHub", title: "Il tag è nel file su main", example: <>dopo il merge della PR: <Mono>@FDR3_011_01 @runnable</Mono></> },
          { place: "Run NRT", title: "La run esegue lo scenario", example: <>behave seleziona <Mono>@runnable</Mono>; Allure scrive l&apos;etichetta <Mono>tag = FDR3_011_01</Mono></> },
          { place: "QA Hub", title: "Arrivano i risultati", example: <>l&apos;esecuzione salvata ha i tag <Mono>[&quot;FDR3_011_01&quot;]</Mono></> },
          { place: "QA Hub", title: "Abbinamento", example: <>tag dello scenario (senza @) o un suo alias, es. il vecchio <Mono>fdr3_011_01</Mono></> },
          { place: "QA Hub", title: "Risultato", example: "Tab NRT: UAT Passato · feature In esecuzione" },
        ]}
      />
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Le run selezionano gli scenari con i tag di categoria (<Code>@runnable</Code>, <Code>@e2e</Code>, <Code>~@skip</Code>), non con i tag identità: per questo il tag identità può cambiare senza rompere le run, purché restino i tag di categoria.</li>
        <li>Gli <strong>alias</strong> sono i vecchi tag di uno scenario, salvati dalla migrazione o da &quot;Importa da Git&quot;: le esecuzioni fatte prima, con il vecchio tag, restano collegate.</li>
        <li>Il tab <strong>NRT</strong> della feature mostra, per ogni scenario, l&apos;ultimo esito per ambiente (con link al report Allure), il pass rate sulle ultime 10 run e il segnale <strong>Flaky</strong>. Uno Schema dello scenario conta come fallito se fallisce almeno un esempio.</li>
        <li>Alla prima esecuzione di uno scenario, una feature <strong>Implementata</strong> diventa <strong>In esecuzione</strong> da sola (subito all&apos;arrivo dei risultati, più un controllo ogni 15 minuti) e non torna indietro.</li>
        <li>Dal report di una run NRT, TAS o Quality Gate, la sezione <strong>Feature collegate</strong> porta alle feature eseguite; nella panoramica ogni ambito mostra il pass rate NRT dei suoi scenari.</li>
      </ul>
      <h3 className="text-[14px] font-semibold text-text">Quando il collegamento non c&apos;è</h3>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>La PR dell&apos;hub (o quella di allineamento) non è ancora integrata: le run usano ancora il vecchio tag, collegato solo se è salvato come alias.</li>
        <li>Il tag è stato cambiato a mano su Git: l&apos;abbinamento è esatto, maiuscole comprese (il sync lo segnala come anomalia).</li>
        <li>Il tag è solo sulla feature intera: contano i tag degli scenari.</li>
      </ul>
    </Section>
  );
}

function MigrationTab() {
  return (
    <>
      <Section title="Migrazione da Confluence">
        <p>
          Una tantum, da chi ha il permesso di migrazione, dalla pagina <strong>Migrazione</strong> (pulsante nella
          pagina Test Lifecycle).
        </p>
        <ExampleFlow
          title="Esempio: migrare l'ambito CUP"
          steps={[
            { place: "Confluence", title: "Pagina FEAT", example: "FEAT_001_CUP — stato \"Approvato\", owner, Jira" },
            { place: "GitHub", title: "Feature file su main", example: <Mono>creazione_posizione_debitoria.feature</Mono> },
            { place: "QA Hub", title: "Analizza", example: "Una riga: pagina + file abbinati, problemi da decidere" },
            { place: "QA Hub", title: "Conferma ed Esegui CUP", example: <>Feature FEAT_001_CUP; vecchi tag → alias</> },
            { place: "GitHub", title: "PR di allineamento", example: <><Mono># qa-hub:</Mono> e tag <Mono>@CUP_001_01</Mono>…, stesso percorso</> },
            { place: "QA Hub", title: "Merge e sync", example: "Non più in attesa di allineamento" },
          ]}
        />
        <Steps
          items={[
            <><strong>Analizza</strong>: l&apos;hub legge le pagine FEAT dell&apos;albero &quot;Testing Suites&quot; e i feature file su <Code>main</Code>, senza modificare nulla, e propone ambito, numero, stato, owner, reviewer e chiavi Jira.</>,
            <>Le righe con problemi (numero doppio, pagina senza file, file senza pagina, reviewer di gruppo, fixture…) vanno <strong>corrette</strong>, <strong>confermate</strong> o <strong>escluse</strong>. Una nuova analisi conserva le decisioni prese.</>,
            <>Nel pannello <strong>Tag trovati nei feature file</strong> togli la spunta ai tag che non vuoi portare nell&apos;hub (vedi sotto). Fallo prima di eseguire l&apos;ambito.</>,
            <><strong>Esegui</strong> un ambito alla volta: l&apos;hub crea le feature (scenari dal file, o dalle tabelle della pagina se il file non c&apos;è), salva i vecchi tag come alias e apre la <strong>PR di allineamento</strong>, senza spostare i file.</>,
            <>Quando il team integra la PR, le feature non sono più &quot;in attesa di allineamento&quot; e il sync le gestisce come tutte le altre.</>,
          ]}
        />
        <p>
          Le pagine Confluence migrate ricevono in cima l&apos;avviso &quot;Migrata su QA Hub&quot;, solo se la scrittura su
          Confluence è stata attivata. Quello che non si è riusciti a leggere dalla pagina resta nella
          <strong> nota di migrazione</strong> della feature.
        </p>
      </Section>
      <Section title="Il pannello &quot;Tag trovati nei feature file&quot;">
        <p>
          Elenca i tag dei feature file che non identificano feature o scenari (per esempio <Code>@regression</Code>,{" "}
          <Code>@checkout</Code>, <Code>@eBollo</Code>), con quante volte compaiono. I tag identità e <Code>@positive</Code> /{" "}
          <Code>@negative</Code> non ci sono: l&apos;hub li gestisce da solo.
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Spuntato = mantieni</strong> (scelta di partenza): il tag resta sugli scenari migrati e nel file riscritto, e diventa selezionabile su tutti gli scenari. Se nel file era sulla feature intera, viene copiato su ogni scenario.</li>
          <li><strong>Senza spunta = rimuovi</strong>: il tag sparisce dagli scenari migrati e, dopo il merge della PR di allineamento, anche dal file su Git.</li>
          <li><strong>Spunta bloccata</strong>: <Code>@runnable</Code>, <Code>@e2e</Code>, <Code>@ui</Code> e <Code>@skip</Code> servono alle run NRT e restano sempre.</li>
          <li>La scelta vale per gli ambiti eseguiti da quel momento in poi. Nel dubbio mantieni: un tag si toglie facilmente da uno scenario, recuperarlo dopo la migrazione no.</li>
        </ul>
      </Section>
    </>
  );
}

function Faq() {
  return (
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
          <dd>Meglio di no: i tag collegano lo scenario alla progettazione e ai risultati NRT. Se li cambi, l&apos;hub apre un&apos;anomalia e le esecuzioni non vengono più collegate.</dd>
        </div>
        <div>
          <dt className="font-medium text-text">Ho un feature file già su GitHub: come lo porto nell&apos;hub?</dt>
          <dd>Se è uno dei file storici, con la <strong>Migrazione</strong>. Se è un file nuovo, magari su un branch, crea la feature e usa <strong>Importa da Git</strong> nel tab Scenari.</dd>
        </div>
        <div>
          <dt className="font-medium text-text">Perché la mia feature non è &quot;In esecuzione&quot;?</dt>
          <dd>Serve che una run NRT abbia eseguito almeno uno scenario con il suo tag, e che la feature sia Implementata. Controlla nel tab NRT se compaiono esecuzioni.</dd>
        </div>
      </dl>
    </Section>
  );
}

const CONTENT: Record<TabValue, () => ReactNode> = {
  panoramica: Overview,
  progettazione: Design,
  git: GitTab,
  jira: JiraTab,
  nrt: NrtTab,
  migrazione: MigrationTab,
  faq: Faq,
};

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export default function TestLifecycleGuidePage() {
  // Link diretto a una sezione: /test-lifecycle/guida#nrt (sul server: nessuna sezione)
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.replace("#", ""),
    () => "",
  );
  const [chosen, setChosen] = useState<TabValue | null>(null);
  const tab: TabValue = chosen ?? (isTab(hash) ? hash : "panoramica");

  const change = (value: string) => {
    if (!isTab(value)) return;
    setChosen(value);
    window.history.replaceState(null, "", `#${value}`);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <Link href="/test-lifecycle" className="flex items-center gap-1 text-[13px] text-text-muted hover:text-text w-fit">
        <ChevronLeft size={14} /> Test Lifecycle
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text">Guida al Test Lifecycle</h1>
        <p className="text-[14px] text-text-dim">
          Come si progetta una feature di test nell&apos;hub, come arriva nel repository dei test su GitHub e come si
          collega a Jira e agli NRT. L&apos;hub sostituisce le pagine Confluence &quot;Testing Suites&quot;.
        </p>
      </div>
      <Tabs value={tab} onValueChange={(v) => change(String(v))}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => {
          const Content = CONTENT[t.value];
          return (
            <TabsContent key={t.value} value={t.value} className="flex flex-col gap-7 pt-3">
              <Content />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
