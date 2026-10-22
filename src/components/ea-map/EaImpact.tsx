"use client";

/* «Impatto»: from a GitHub pull request or comparison to who can break, what to test and
   which SANP processes are involved. The analysis runs on the backend, on demand. */

import { useState, type FormEvent } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, GitPullRequest, Loader2, MapPin, Waypoints } from "lucide-react";
import type { EaImpactedNode, EaReleaseImpact, EaRisk } from "@/types/ea";
import { useEaReleaseImpact } from "@/hooks/useEaMap";
import { RISK_LABEL, errorMessage } from "@/lib/ea-map/assist";
import type { EaGraph } from "@/lib/ea-map/graph";
import { cx, qc } from "./shared";
import s from "./ea-assist.module.css";

const RISKS: EaRisk[] = ["alto", "medio", "basso"];
const RELATION_LABEL: Record<string, string> = {
  chiamante: "lo chiama",
  dipendenza: "è chiamato",
  "dato a valle": "dato a valle",
};

function relationLabel(relations: string[]): string {
  if (relations.includes("chiamante") && relations.includes("dipendenza")) {
    const rest = relations.filter((r) => r !== "chiamante" && r !== "dipendenza").map((r) => RELATION_LABEL[r] ?? r);
    return ["dipendenza reciproca", ...rest].join(" · ");
  }
  return relations.map((r) => RELATION_LABEL[r] ?? r).join(" · ");
}

interface Props {
  g: EaGraph;
  openNode: (id: string) => void;
  onShow: (ids: string[]) => void;
}

function Path({ g, path }: { g: EaGraph; path: string[] }) {
  return (
    <span className={s.path}>
      {path.map((id, i) => (
        <span key={id}>{i > 0 && <span className={s.arrow}>→</span>}{g.byId.get(id)?.name ?? id}</span>
      ))}
    </span>
  );
}

function ImpactRow({ g, x, openNode }: { g: EaGraph; x: EaImpactedNode; openNode: (id: string) => void }) {
  return (
    <li className={s.imp}>
      <button type="button" onClick={() => openNode(x.id)} className={s.impMain}>
        <b>{x.name}</b>
        {x.product && <span className={s.dim}>{x.product}</span>}
        {x.qa_score !== null && (
          <span className={s.score} style={{ background: qc(x.qa_score) }} title="Maturità dei test (0–5)">{x.qa_score}</span>
        )}
      </button>
      <span className={s.rel}>
        {relationLabel(x.relations ?? [x.relation])}
        {x.depth > 1 ? ` · ${x.depth} passaggi` : ""}
      </span>
      {x.depth > 1 && <Path g={g} path={x.path} />}
    </li>
  );
}

function Result({ g, r, openNode, onShow }: { g: EaGraph; r: EaReleaseImpact; openNode: Props["openNode"]; onShow: Props["onShow"] }) {
  const [copied, setCopied] = useState(false);
  const must = r.suites.filter((x) => x.priority <= 1);
  const nice = r.suites.filter((x) => x.priority > 1);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(must.map((x) => `- ${x.name}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard not available: nothing to do */
    }
  };
  return (
    <div className={s.result}>
      <div className={s.hero}>
        <div className={s.heroMain}>
          <span className={s.kicker}><GitPullRequest aria-hidden="true" /> {r.change.repo} · {r.change.ref}{r.change.state ? ` · ${r.change.state}` : ""}</span>
          <h3>
            {r.change.url ? <a href={r.change.url} target="_blank" rel="noopener noreferrer">{r.change.title} <ExternalLink aria-hidden="true" /></a> : r.change.title}
          </h3>
          <p className={s.dim}>
            {r.change.files} file · <span className={s.add}>+{r.change.additions}</span> <span className={s.del}>−{r.change.deletions}</span> · componente{" "}
            <button type="button" className={s.link} onClick={() => openNode(r.component.id)}>{r.component.name}</button>
            {r.component.product ? ` (${r.component.product})` : ""}
          </p>
          <div className={s.cats}>
            {r.categories.map((c) => (
              <span key={c.key} className={cx(s.cat, c.weight >= 3 && s.catHot)} title={c.examples.join("\n")}>
                {c.label} <b>{c.files}</b>
              </span>
            ))}
          </div>
        </div>
        <div className={cx(s.risk, s[`risk_${r.risk}`])}>
          <span>Rischio</span>
          <b>{RISK_LABEL[r.risk]}</b>
          <small>{r.impacted.filter((x) => x.risk !== "basso").length} elementi da guardare</small>
        </div>
      </div>

      <div className={s.cols}>
        <section className={s.col}>
          <h4><Waypoints aria-hidden="true" /> Chi può rompersi</h4>
          {r.impacted.length === 0 && <p className={s.dim}>Nessun impatto: la modifica tocca solo test o documentazione.</p>}
          {RISKS.map((risk) => {
            const items = r.impacted.filter((x) => x.risk === risk);
            if (!items.length) return null;
            return (
              <div key={risk} className={s.group}>
                <span className={cx(s.tag, s[`risk_${risk}`])}>{RISK_LABEL[risk]} · {items.length}</span>
                <ul>{items.slice(0, 25).map((x) => <ImpactRow key={x.id} g={g} x={x} openNode={openNode} />)}</ul>
                {items.length > 25 && <p className={s.dim}>… e altri {items.length - 25}</p>}
              </div>
            );
          })}
        </section>

        <section className={s.col}>
          <h4><Check aria-hidden="true" /> Cosa testare</h4>
          {must.length > 0 ? (
            <>
              <div className={s.colHead}>
                <span className={s.dim}>Da eseguire prima del rilascio</span>
                <button type="button" className={s.ghost} onClick={copy}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied ? "Copiato" : "Copia elenco"}
                </button>
              </div>
              <ul className={s.suites}>
                {must.map((x) => (
                  <li key={x.name}><b>{x.name}</b><span className={s.dim}>{x.kind} · copre {x.covers.map((id) => g.byId.get(id)?.name ?? id).join(", ")}</span></li>
                ))}
              </ul>
            </>
          ) : (
            <p className={s.dim}>Nessuna suite nota copre il componente modificato o i suoi chiamanti diretti.</p>
          )}
          {nice.length > 0 && (
            <details className={s.more}>
              <summary>Consigliate per gli impatti indiretti · {nice.length}</summary>
              <ul className={s.suites}>{nice.map((x) => <li key={x.name}><b>{x.name}</b><span className={s.dim}>{x.kind}</span></li>)}</ul>
            </details>
          )}
          {r.gaps.length > 0 && (
            <div className={s.gaps}>
              <h5><AlertTriangle aria-hidden="true" /> Lacune di test</h5>
              <ul>
                {r.gaps.map((x) => (
                  <li key={x.id}><button type="button" className={s.link} onClick={() => openNode(x.id)}>{x.name}</button> — {x.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className={s.col}>
          <h4><MapPin aria-hidden="true" /> Processi e servizi coinvolti</h4>
          {r.processes.length === 0 && <p className={s.dim}>Nessun processo del Blueprint collegato ai prodotti impattati.</p>}
          <ul className={s.procs}>
            {r.processes.map((p) => (
              <li key={p.id}>
                <b>{p.name}</b>
                {p.services.length > 0 && <span className={s.dim}>Servizi: {p.services.join(", ")}</span>}
                <span className={s.dim}>tramite {p.via.join(", ")}</span>
                {p.ref?.url && <a href={p.ref.url} target="_blank" rel="noopener noreferrer">{p.ref.title ?? "Pagina Confluence"} <ExternalLink aria-hidden="true" /></a>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={s.resultFoot}>
        <button type="button" className={s.primary} onClick={() => onShow(r.highlight)}>
          <MapPin aria-hidden="true" /> Mostra sulla mappa
        </button>
        <span className={s.dim}>Si accendono il componente modificato e gli elementi a rischio alto e medio.</span>
      </div>
    </div>
  );
}

export function EaImpact({ g, openNode, onShow }: Props) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"link" | "tag">("link");
  const [repo, setRepo] = useState("");
  const [base, setBase] = useState("");
  const [head, setHead] = useState("main");
  const analyse = useEaReleaseImpact();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "link") analyse.mutate({ url: url.trim() });
    else analyse.mutate({ repo: repo.trim(), base: base.trim(), head: head.trim() });
  };
  const ready = mode === "link" ? url.trim().length > 0 : repo.trim() && base.trim() && head.trim();

  return (
    <div className={s.impact}>
      <form className={s.ask} onSubmit={submit}>
        <div className={s.askHead}>
          <h3>Impatto di un rilascio</h3>
          <p className={s.dim}>
            Dalla modifica al rischio: chi la chiama, quali dati alimenta, quali suite eseguire, quali processi SANP tocca.
          </p>
        </div>
        <div className={s.modes} role="radiogroup" aria-label="Origine della modifica">
          <button type="button" role="radio" aria-checked={mode === "link"} onClick={() => setMode("link")}>Pull request o confronto</button>
          <button type="button" role="radio" aria-checked={mode === "tag"} onClick={() => setMode("tag")}>Repository e tag</button>
        </div>
        {mode === "link" ? (
          <input
            className={s.field}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/pagopa/pagopa-debt-position/pull/123"
            aria-label="Link della pull request o del confronto"
          />
        ) : (
          <div className={s.tagRow}>
            <input className={s.field} list="ea-impact-repos" value={repo} onChange={(e) => setRepo(e.target.value)}
              placeholder="Repository, es. pagopa-debt-position" aria-label="Repository" />
            <datalist id="ea-impact-repos">{g.components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</datalist>
            <input className={s.field} value={base} onChange={(e) => setBase(e.target.value)} placeholder="da, es. 0.12.3" aria-label="Riferimento di partenza" />
            <input className={s.field} value={head} onChange={(e) => setHead(e.target.value)} placeholder="a, es. main" aria-label="Riferimento di arrivo" />
          </div>
        )}
        <button type="submit" className={s.primary} disabled={!ready || analyse.isPending}>
          {analyse.isPending ? <Loader2 aria-hidden="true" className={s.spin} /> : <Waypoints aria-hidden="true" />}
          {analyse.isPending ? "Analisi in corso…" : "Analizza l’impatto"}
        </button>
      </form>

      {analyse.isError && (
        <div role="alert" className={s.alert}>{errorMessage(analyse.error, "Analisi non riuscita, riprova tra poco.")}</div>
      )}
      {analyse.data && <Result g={g} r={analyse.data} openNode={openNode} onShow={onShow} />}
    </div>
  );
}
