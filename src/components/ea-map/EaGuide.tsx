"use client";

import type { ReactNode } from "react";
import { isRuntime, type EaGraph } from "@/lib/ea-map/graph";
import { Crumbs, qc } from "./shared";
import s from "./ea-map.module.css";

const TOC: [string, string][] = [
  ["uso", "Come si usa"],
  ["viste", "Le viste"],
  ["modello", "Il modello dei dati"],
  ["fonti", "Fonti e acquisizione"],
  ["relazioni", "Come nascono i legami"],
  ["qa", "Integrazione con la QA"],
  ["maturita", "Livello di maturità"],
  ["limiti", "Limiti e cose da validare"],
  ["correggi", "Correggere la mappa"],
  ["aggiorna", "Aggiornamento dei dati"],
  ["glossario", "Glossario"],
];

function Sec({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={s.gSec} id={`ea-guide-${id}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const GLOSSARY: [string, string][] = [
  ["SANP", "Specifiche Attuative del Nodo dei Pagamenti"],
  ["NdP", "Nodo dei Pagamenti"],
  ["EC", "Ente Creditore"],
  ["PSP", "Prestatore di Servizi di Pagamento"],
  ["PT", "Partner tecnologico o intermediario"],
  ["GPD", "Gestione Posizioni Debitorie"],
  ["ACA", "Archivio Centralizzato Avvisi"],
  ["FdR", "Flussi di Rendicontazione (FdR1 SOAP/XML, FdR3 REST/JSON)"],
  ["GEC / AFM", "Gestione Evoluta delle Commissioni / Advanced Fees Management"],
  ["MBD", "Marca da Bollo Digitale"],
  ["RTP", "Request To Pay"],
  ["TAS", "Test Automation Service: workflow riusabile che esegue le suite centrali"],
  ["NRT", "Non Regression Test, suite eseguite ogni giorno in UAT"],
  ["TA / TM", "Test automatici / test manuali"],
  ["CoE QA", "Centro di Competenza QA del Dipartimento Pagamenti"],
  ["AKS", "Azure Kubernetes Service; ogni dominio ha un proprio namespace"],
  ["APIM", "Azure API Management, il gateway delle API"],
  ["PDV", "Personal Data Vault, tokenizzazione dei dati personali"],
  ["NPG", "Nexi Payment Gateway"],
];

export function EaGuide({ g, goTo }: { g: EaGraph; goTo: (id: string | null) => void }) {
  const comps = g.components;
  const rt = comps.filter(isRuntime);
  const E = g.kb.edges;
  const byOrigin = (o: string) => E.filter((e) => e.origin === o).length;
  const eAuto = byOrigin("helm");
  const eCur = E.length - eAuto;
  const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
  const byType = (t: string) => E.filter((e) => e.type === t).length;
  const dist = [0, 1, 2, 3, 4, 5].map((v) => rt.filter((c) => c.qa.score === v).length);
  const maxD = Math.max(...dist, 1);
  const nrtIds = [...new Set(comps.flatMap((c) => c.qa.nrt))];
  const tasN = rt.filter((c) => c.qa.tas).length;
  const confP = g.products.filter((p) => p.conf.length).length;
  const src = g.kb.meta.sources ?? {};
  const publicRepos = comps.filter((c) => !c.private).length;
  const scrollTo = (id: string) => document.getElementById(`ea-guide-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <Crumbs path={[{ label: "Piattaforma pagoPA", onClick: () => goTo(null) }, { label: "Guida" }]} level={-1} />
      <div className={s.guide}>
        <nav className={s.gToc} aria-label="Indice della guida">
          <b>Indice</b>
          {TOC.map(([k, l]) => <button key={k} type="button" onClick={() => scrollTo(k)}>{l}</button>)}
        </nav>
        <article className={s.gBody}>
          <h1 className={s.h2}>Guida alla EA Map</h1>
          <p className={s.lead}>
            La mappa descrive la piattaforma dei pagamenti dall&apos;alto verso il basso: servizi, processi, prodotti, componenti e
            repository. Sopra ogni elemento mostra quanto è coperto dai test. Questa guida spiega da dove vengono i dati, come
            sono collegati e come leggere gli indicatori. I numeri citati sono calcolati in tempo reale sui dati attuali.
          </p>

          <Sec id="uso" title="Come si usa">
            <ul>
              <li><b>Per capire il perimetro</b> parti dal <b>Blueprint</b>: i quattro livelli (Contesto, Processi, Applicazioni, Infrastruttura) danno la vista d&apos;insieme.</li>
              <li><b>Per un&apos;analisi d&apos;impatto</b> clicca un elemento del Blueprint: si evidenzia tutta la catena verticale e il pannello <b>Impatto</b> riassume servizi, processi, prodotti e risorse coinvolti, con la loro copertura di test. Un secondo clic deseleziona.</li>
              <li><b>Per scendere nel dettaglio</b> usa <b>Architettura</b>: area → prodotto → componente. Nella scheda del componente trovi stack, namespace AKS, API, owner, pipeline, documentazione e il link al repository.</li>
              <li><b>Per la QA</b> attiva la <b>Lente QA</b> (colora gli elementi per maturità) o apri la <b>Matrice QA</b> per filtrare e ordinare tutti i componenti.</li>
              <li><b>Per trovare qualcosa</b> premi <span className={s.kbd}>/</span> e cerca per nome, repository, namespace o descrizione. Ogni prodotto e componente ha un indirizzo proprio che puoi condividere.</li>
            </ul>
          </Sec>

          <Sec id="viste" title="Le viste">
            <div className={s.gCards}>
              <div><h3>Blueprint</h3><p>Ispirata al Pagoda Blueprint. Quattro piani sovrapposti: chi usa la piattaforma e i servizi offerti; le funzioni di business con i processi SANP; i prodotti raggruppati per area; le risorse cloud e i namespace AKS. Ai lati missione, stakeholder, iniziative, principi, criticità e numeri chiave.</p></div>
              <div><h3>Architettura</h3><p>Navigazione a zoom. La vista prodotto è un diagramma a tre colonne: a sinistra chi usa il prodotto, al centro i suoi componenti per tipo, a destra le sue dipendenze. Passando sopra un componente si evidenziano i suoi legami.</p></div>
              <div><h3>Data Lake</h3><p>Il percorso dei dati nel Data Lake aziendale, dai data contract: sorgenti, ingestion (topic Event Hub), tabelle silver e gold, consumer (BI, MEF, Banca d&apos;Italia). Cliccando un elemento si evidenzia la sua catena a monte e a valle; la scheda del dataset mostra contratto, server, owner, SLA, campi con dati personali e check di qualità. Il simbolo ⚠ segnala tabelle citate nei contratti ma senza un contratto proprio.</p></div>
              <div><h3>Matrice QA</h3><p>Una riga per componente con unit test, feature di integrazione, copertura TAS, NRT, performance e maturità. Filtri rapidi per trovare i buchi (es. &quot;Senza integrazione&quot;).</p></div>
              <div><h3>Lente QA</h3><p>Interruttore in alto. Non cambia i dati: colora prodotti, componenti e processi in base alla maturità dei test, dal rosso (0) al verde scuro (5).</p></div>
            </div>
          </Sec>

          <Sec id="modello" title="Il modello dei dati">
            <p>Tutto è un grafo di <b>nodi</b> e <b>legami</b> salvato in PostgreSQL. La gerarchia ha quattro livelli:</p>
            <table className={s.gTbl}>
              <thead><tr><th>Livello</th><th>Cosa rappresenta</th><th className={s.num}>Quanti</th></tr></thead>
              <tbody>
                <tr><td>Area</td><td>Macro-ambito della piattaforma (es. Nodo dei Pagamenti, Gestione Posizioni Debitorie)</td><td className={s.num}>{g.areas.length}</td></tr>
                <tr><td>Prodotto</td><td>Capacità riconoscibile dal business (es. GPD, Checkout, FdR). Di solito coincide con un dominio infrastrutturale</td><td className={s.num}>{g.products.length}</td></tr>
                <tr><td>Componente</td><td>Un repository GitHub: microservizio, Azure Function, frontend, libreria, test, mock, tool, infrastruttura o documentazione</td><td className={s.num}>{comps.length}</td></tr>
                <tr><td>Repository</td><td>Il sorgente, raggiungibile dal pulsante &quot;Apri il repository&quot;</td><td className={s.num}>{comps.length}</td></tr>
              </tbody>
            </table>
            <p>Accanto alla gerarchia ci sono i <b>sistemi esterni</b> (EC, PSP, App IO, PDV, Nexi NPG, Banca d&apos;Italia…) e i <b>datastore condivisi</b> (database Cosmos usati da più componenti). Il Blueprint aggiunge segmenti, servizi, funzioni di business, processi e risorse infrastrutturali.</p>
            <p>I componenti <b>runtime</b> sono microservizi, Azure Functions e frontend ({rt.length} in tutto): sono quelli su cui si calcolano percentuali e medie QA, perché librerie, mock e repo di test non vanno in esercizio.</p>
          </Sec>

          <Sec id="fonti" title="Fonti e acquisizione">
            <table className={s.gTbl}>
              <thead><tr><th>Fonte</th><th>Cosa ne ricaviamo</th><th>Come</th></tr></thead>
              <tbody>
                <tr><td><b>Data contract</b></td><td>Dataset del Data Lake della piattaforma: livello, tabella o topic, owner, schema (numero di campi e dati personali), SLA, check SodaCL, da quali tabelle derivano e chi li usa</td><td>Repository <span className={s.mono}>pagopa/pdnd-data-contracts</span>, cartella <span className={s.mono}>src/data/pagopa</span>, letto dalla sincronizzazione settimanale</td></tr>
                <tr><td><b>GitHub, org pagopa</b></td><td>Elenco dei repository: dei 784 pubblici restano {publicRepos} che riguardano i pagamenti (attivi, non fork, nome <span className={s.mono}>pagopa-*</span> o domini arc, emd, rtp, qe)</td><td>API di GitHub</td></tr>
                <tr><td><b>Contenuto dei repo</b></td><td>Linguaggio e framework, namespace AKS e ingress (values Helm), URL dei servizi chiamati (envConfig), contratti OpenAPI, test (unit, feature Gherkin, performance, E2E), workflow GitHub Actions, owner (CODEOWNERS), estratto del README e link a Confluence</td><td>Lettura dei soli file di metadati, senza scaricare tutto il codice</td></tr>
                <tr><td><b>pagopa-infra</b></td><td>I domini infrastrutturali (namespace AKS) e le API pubblicate su API Management per dominio</td><td>Struttura delle cartelle <span className={s.mono}>src/domains</span></td></tr>
                <tr><td><b>pagopa-platform-integration-test</b></td><td>Suite di integrazione centrali, registro delle NRT e workflow del Test Automation Service</td><td>Lettura di <span className={s.mono}>src/</span>, <span className={s.mono}>.github/nrt-suites.json</span> e dei workflow</td></tr>
                <tr><td><b>pagopa-nodo-dei-pagamenti-test</b></td><td>Le oltre 1.500 feature BDD sulle primitive del Nodo, raggruppate per modello (Mod1, Mod3, IO, MBD, RT…)</td><td>Conteggio delle feature per cartella</td></tr>
                <tr><td><b>Confluence</b></td><td>{(src.confluence_pages ?? 0).toLocaleString("it-IT")} titoli di pagina negli spazi {(src.confluence_spaces ?? []).join(", ")}; lettura completa di una ventina di pagine chiave (Componenti e rischio, Censimento repository, Modello Operativo QA, Touchpoint API…)</td><td>API REST di Confluence</td></tr>
                <tr><td><b>Curatela</b></td><td>Classificazione in aree e prodotti, descrizioni, servizi e processi del Blueprint, legami che il codice non dichiara</td><td>Scritta a mano a partire dalle fonti sopra; è la parte da validare</td></tr>
              </tbody>
            </table>
            <p className={s.note}>Il repository del Nodo (<span className={s.mono}>pagopa-nodo4-nodo-dei-pagamenti</span>) è privato: oggi i suoi dati vengono da Confluence e dalle suite di test; la sincronizzazione lo leggerà con il token del Hub.</p>
          </Sec>

          <Sec id="relazioni" title="Come nascono i legami">
            <p>
              Ogni legame ha un <b>tipo</b> e un&apos;<b>origine</b>. Oggi la mappa contiene {E.length} legami tecnici: {byType("api")} chiamate API,{" "}
              {byType("data")} dati condivisi, {byType("event")} eventi, {byType("soap")} chiamate SOAP e {byType("ui")} di interfaccia.
            </p>
            <div className={s.gSplit}>
              <div className={s.stat}><b>{eAuto}</b><span>{pct(eAuto, E.length)}% · rilevati dal codice</span></div>
              <div className={s.stat}><b>{eCur}</b><span>{pct(eCur, E.length)}% · curati o inseriti a mano</span></div>
            </div>
            <h3>Rilevati dal codice</h3>
            <p>Per ogni servizio leggiamo i valori Helm di produzione (o UAT se manca) e prendiamo gli URL presenti nella configurazione. Ogni URL viene confrontato con una tabella di corrispondenze: per esempio un URL che contiene <span className={s.mono}>/gpd/api</span> diventa un legame verso GPD Core, <span className={s.mono}>api.tokenizer.pdv</span> verso il PDV Tokenizer, un account <span className={s.mono}>…bizevents-ds-cosmos</span> verso il datastore Biz Events. Se due servizi usano lo stesso database, entrambi puntano a quel datastore: è un accoppiamento implicito che vale la pena conoscere.</p>
            <h3>Curati a mano</h3>
            <p>I flussi asincroni (eventi su Event Hub, code), le chiamate SOAP del Nodo e i legami con gli attori esterni non compaiono nella configurazione. Sono stati aggiunti partendo da Confluence e dalla conoscenza dei flussi SANP. Sono i primi da verificare.</p>
            <h3>Gerarchia e Blueprint</h3>
            <p>L&apos;appartenenza di un componente a un prodotto e di un prodotto a un&apos;area è curata. Nel Blueprint, servizi, processi e il legame processo → prodotto sono curati. Il legame prodotto → infrastruttura è in gran parte calcolato:</p>
            <ul>
              <li>il namespace AKS viene dal dominio del prodotto;</li>
              <li>Function Apps se il prodotto ha componenti Azure Functions;</li>
              <li>API Management se espone API o un ingress;</li>
              <li>Cosmos DB se usa un datastore condiviso;</li>
              <li>le altre risorse (PostgreSQL, Event Hub, Nodo erogato da Nexi…) sono curate.</li>
            </ul>
            <h3>Documentazione</h3>
            <p>I link Confluence dei prodotti vengono da regole sui titoli delle pagine di primo e secondo livello di ciascuno spazio (es. la pagina &quot;[FdR - Flussi di Rendicontazione]&quot; per il prodotto FdR). {confP} prodotti su {g.products.length} hanno almeno una pagina associata. Le criticità HIGH, MEDIUM e LOW sono riportate così come scritte nella pagina &quot;Componenti e rischio&quot;.</p>
          </Sec>

          <Sec id="qa" title="Integrazione con la QA">
            <p>Per ogni componente la mappa raccoglie questi segnali:</p>
            <table className={s.gTbl}>
              <thead><tr><th>Segnale</th><th>Quando è positivo</th><th>Da dove viene</th></tr></thead>
              <tbody>
                <tr><td>Unit test</td><td>Almeno un file di test nel repo (<span className={s.mono}>src/test</span>, <span className={s.mono}>*.test.ts</span>, <span className={s.mono}>*_test.go</span>…)</td><td>Struttura del repo</td></tr>
                <tr><td>Integrazione nel repo</td><td>Feature Gherkin nel repo oppure un workflow di integration test</td><td>Repo e workflow</td></tr>
                <tr><td>Suite centrale / TAS</td><td>Esiste una suite in <span className={s.mono}>pagopa-platform-integration-test</span> che esercita il componente, quindi eseguibile dal Test Automation Service</td><td>Mappatura suite → componenti</td></tr>
                <tr><td>NRT</td><td>Il componente è coperto da una suite del registro NRT, eseguita ogni giorno in UAT. Oggi: {nrtIds.join(", ") || "nessuna"}</td><td><span className={s.mono}>.github/nrt-suites.json</span></td></tr>
                <tr><td>Performance</td><td>File di test di carico nel repo (k6, JMeter, cartelle <span className={s.mono}>performance-test</span>)</td><td>Struttura del repo</td></tr>
                <tr><td>Suite BDD Nodo</td><td>Il componente è coperto dalle feature di <span className={s.mono}>pagopa-nodo-dei-pagamenti-test</span></td><td>Repo di test del Nodo</td></tr>
                <tr><td>Pipeline invoca TAS</td><td>La CI del repo chiama il workflow del TAS. Oggi nessun repo lo fa, quindi resta &quot;da confermare&quot;</td><td>Workflow dei repo</td></tr>
                <tr><td>Sotto QA (CoE)</td><td>Il componente è nel perimetro del Centro di Competenza QA</td><td>Dichiarato dal team QA</td></tr>
              </tbody>
            </table>
            <p>Nel Blueprint ogni processo porta un badge per le suite che lo coprono, per esempio &quot;NRT checkout&quot; o &quot;Nodo BDD · appIO&quot;. Oggi {tasN} componenti runtime su {rt.length} sono coperti da una suite centrale.</p>
          </Sec>

          <Sec id="maturita" title="Livello di maturità">
            <p>La maturità è un punteggio da <b>0 a 5</b>: un punto per ciascun livello di test presente. Misura la <b>presenza</b> dei test, non il loro esito né la loro qualità.</p>
            <table className={s.gTbl}>
              <thead><tr><th>+1 se</th><th>Condizione</th></tr></thead>
              <tbody>
                <tr><td>Unit</td><td>Almeno un file di test unitario nel repo</td></tr>
                <tr><td>Integrazione</td><td>Feature Gherkin o workflow di integrazione nel repo, oppure suite BDD del Nodo</td></tr>
                <tr><td>Suite centrale</td><td>Coperto da una suite di platform-integration-test (TAS) o dalla suite BDD del Nodo</td></tr>
                <tr><td>Performance</td><td>Test di carico nel repo</td></tr>
                <tr><td>NRT</td><td>Incluso in una suite di non regressione schedulata</td></tr>
              </tbody>
            </table>
            <div className={s.gDist} role="img" aria-label="Distribuzione dei componenti runtime per maturità">
              {dist.map((n, v) => (
                <div key={v}>
                  <span className={s.gBar} style={{ height: Math.max(4, (n / maxD) * 110), background: qc(v) }} />
                  <b>{n}</b>
                  <small>{v}</small>
                </div>
              ))}
            </div>
            <p className={s.note}>Componenti runtime per punteggio di maturità.</p>
            <h3>Come si aggrega</h3>
            <ul>
              <li><b>Prodotto e area</b>: media dei punteggi dei componenti runtime (se un prodotto non ne ha, di tutti i suoi componenti).</li>
              <li><b>Processo</b> (Blueprint): media dei componenti runtime di tutti i prodotti coinvolti nel processo.</li>
              <li><b>Pannello Impatto</b>: media dei componenti runtime della catena selezionata, con l&apos;elenco di quelli senza test di integrazione.</li>
            </ul>
            <p>I colori della Lente QA arrotondano la media all&apos;intero più vicino, da 0 (rosso) a 5 (verde scuro).</p>
          </Sec>

          <Sec id="limiti" title="Limiti e cose da validare">
            <ul>
              <li>La classificazione in aree, prodotti e processi è una proposta: va rivista con i team.</li>
              <li>I {eCur} legami curati vanno confermati, a partire dai flussi del Nodo.</li>
              <li>I legami rilevati dal codice dipendono dagli URL in configurazione: chiamate costruite a runtime o passate da segreti non si vedono.</li>
              <li>La maturità conta file e configurazioni: un test presente ma spento o fallito vale come presente.</li>
              <li>&quot;Sotto QA&quot; e &quot;Pipeline invoca TAS&quot; sono da compilare a cura del team QA.</li>
              <li>Le pagine Confluence sono collegate per titolo: alcune associazioni possono mancare o essere imprecise.</li>
            </ul>
          </Sec>

          <Sec id="correggi" title="Correggere la mappa">
            <p>Chi ha il permesso di modifica (di default qa_engineer, qa_manager e superadmin) corregge la mappa direttamente dalla scheda di un elemento:</p>
            <ul>
              <li><b>Relazioni</b>: ogni legame mostra il tipo, da dove viene (dal codice, da regola, curato, manuale) e se è <b>verificato</b> o <b>da verificare</b>. Con ✓ lo confermi, con la matita ne correggi tipo, etichetta e nota, con ✕ lo rimuovi. &quot;Aggiungi legame&quot; crea un legame nuovo: la nota è obbligatoria e serve a dire da dove viene l&apos;informazione.</li>
              <li><b>Modifica scheda</b>: nome, descrizione, prodotto di appartenenza e tipo del componente.</li>
              <li><b>Modifica dati QA</b> (permesso dedicato): perimetro CoE, chiamata al TAS dalla pipeline quando il rilevamento automatico sbaglia, referente e note QA. I segnali letti dai repository (test trovati, suite, NRT) restano automatici.</li>
            </ul>
            <p>Ogni correzione porta il nome di chi l&apos;ha fatta e finisce nello <b>Storico modifiche</b> in fondo alla scheda. Un legame rimosso non sparisce dal database: resta tra i &quot;legami rimossi&quot;, da cui si può ripristinare, e la sincronizzazione non lo riproporrà. Le correzioni manuali hanno sempre la precedenza sui dati letti da GitHub e Confluence.</p>
          </Sec>

          <Sec id="aggiorna" title="Aggiornamento dei dati">
            <p>I dati sono su PostgreSQL. Il primo caricamento ha importato la knowledge base prodotta dagli script di discovery; da lì in poi la mappa si aggiorna con una <b>sincronizzazione settimanale</b> (il lunedì mattina) che si può forzare con il pulsante &quot;Sincronizza ora&quot;.</p>
            <h3>Cosa legge</h3>
            <ul>
              <li><b>GitHub</b>: l&apos;elenco dei repository dell&apos;organizzazione e, solo per quelli modificati dall&apos;ultima volta, l&apos;albero dei file e i file di metadati (Helm, CODEOWNERS, build, OpenAPI, workflow, README). Le regole sono le stesse dell&apos;import: una sync su dati invariati non cambia nulla.</li>
              <li><b>Confluence</b>: i titoli delle pagine dei sette spazi, per aggiornare i link ai prodotti. Usa l&apos;utenza Atlassian già configurata per Jira; se manca, la sync aggiorna comunque GitHub e risulta &quot;parziale&quot;.</li>
            </ul>
            <h3>Cosa applica da sola e cosa chiede</h3>
            <ul>
              <li><b>Applicato subito</b>: linguaggi e framework, namespace, owner, API, pipeline, estratto del README, segnali di test osservati (unit, feature, performance, Sonar, chiamata al TAS) e link Confluence. Sono dati osservati: si vedono nella scheda &quot;Revisione&quot; alla voce &quot;Applicato automaticamente&quot;.</li>
              <li><b>Proposto a un revisore</b> (permesso &quot;review&quot;, di default qa_manager e superadmin) nella scheda <b>Revisione</b>: repository nuovi con un owner già presente nella mappa, repository archiviati, dipendenze nuove trovate nella configurazione Helm e dipendenze sparite.</li>
              <li><b>Conflitti</b>: se sparisce dalla configurazione un legame che una persona aveva confermato, decide sempre una persona.</li>
            </ul>
            <p>La sync non tocca mai nomi, descrizioni, prodotto di appartenenza, tipo di componente, dati QA manuali e legami manuali o verificati. Una proposta rifiutata non viene riproposta; una proposta che la sync successiva non trova più viene chiusa da sola come &quot;superata&quot;.</p>
          </Sec>

          <Sec id="glossario" title="Glossario">
            <dl className={s.gGl}>
              {GLOSSARY.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Sec>
        </article>
      </div>
    </>
  );
}

