"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import type { EaArea, EaComponent, EaNode } from "@/types/ea";
import { DataLakeFeeds, DataLakeProduced, DatasetBody } from "./EaDatasetBody";
import { Gate } from "@/lib/permissions";
import { useEaNodeDetail } from "@/hooks/useEaMap";
import { infraType } from "@/lib/ea-map/infraIcons";
import { productOf, shortName, type EaGraph } from "@/lib/ea-map/graph";
import { EaNodeDialog, EaQaDialog } from "./EaEditDialogs";
import { EaHistory, EaRelations } from "./EaRelations";
import { ScoreBar, cx } from "./shared";
import s from "./ea-map.module.css";

/** True while a modal dialog (edit forms) is open above the drawer. */
const dialogOpen = () => typeof document !== "undefined" && !!document.querySelector('[data-slot="dialog-content"]');

type Tile = [title: string, state: "y" | "n" | "u", text: string];

function yn(v: boolean | null | undefined, yes: string, no: string, unknown = "Da confermare"): ["y" | "n" | "u", string] {
  if (v === null || v === undefined) return ["u", unknown];
  return v ? ["y", yes] : ["n", no];
}

function ComponentBody({ g, c, onOpen, goTo }: { g: EaGraph; c: EaComponent; onOpen: (id: string) => void; goTo: (id: string) => void }) {
  const p = productOf(g, c);
  const a = g.byId.get(p.parent) as EaArea;
  const q = c.qa;
  const tiles: Tile[] = [
    ["Sotto QA (CoE)", ...yn(q.under_qa, "Nel perimetro del Centro di Competenza", "Fuori perimetro")],
    ["Unit test", ...yn(q.unit > 0, `${q.unit} file di test nel repo`, "Nessun test unitario trovato")],
    ["Integrazione nel repo", ...yn(q.it_repo > 0 || q.it_wf, q.it_repo ? `${q.it_repo} feature Gherkin` : "Workflow di integration test", "Nessuna suite nel repo")],
    ["Suite centrale / TAS", ...yn(q.tas || q.nodo_bdd, q.nodo_bdd ? "Suite BDD Nodo (1.500+ feature)" : `Suite: ${q.central.join(", ")}`, "Nessuna suite in platform-integration-test")],
    ["NRT", ...yn(q.nrt.length > 0, `Suite NRT: ${q.nrt.join(", ")} (giornaliera, UAT)`, "Non incluso nelle NRT")],
    ["Performance", ...yn(q.perf_repo, "Test di carico nel repo (k6/JMeter)", "Nessun test di performance nel repo")],
    ["Pipeline invoca TAS", ...yn(q.tas_ci ? true : null, "La CI del repo chiama il TAS", "", "Nessuna chiamata rilevata")],
    ["Analisi statica", ...yn(q.sonar, "SonarCloud in CI", "Sonar non rilevato")],
  ];
  const [qaOpen, setQaOpen] = useState(false);
  return (
    <>
      <p style={{ margin: 0, fontSize: 15 }}>{c.desc}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a className={s.btn} href={c.repo} target="_blank" rel="noopener noreferrer">Apri il repository</a>
        <button type="button" className={cx(s.btn, s.btnGhost)} onClick={() => goTo(p.id)}>{shortName(p.name)}</button>
      </div>
      <section className={s.dbSec}>
        <div className={s.secHead}>
          <h4>Copertura QA</h4>
          <Gate action="edit:ea_qa">
            <button type="button" className={s.linkBtn} onClick={() => setQaOpen(true)}>
              <Pencil size={12} /> Modifica dati QA
            </button>
          </Gate>
        </div>
        <div className={s.score}>
          <ScoreBar value={q.score} />
          <b>{q.score}/5</b>
          <span className={s.no} style={{ fontSize: 12.5 }}>maturità test</span>
        </div>
        <div className={s.qagrid}>
          {tiles.map(([t, st, txt]) => (
            <div key={t} className={cx(s.qi, st === "y" && s.qiY, st === "n" && s.qiN, st === "u" && s.qiU)}>
              <span className={s.ic}>{st === "y" ? "✓" : st === "n" ? "–" : "?"}</span>
              <div><b>{t}</b><span>{txt}</span></div>
            </div>
          ))}
        </div>
        {(q.qa_owner || q.qa_notes) && (
          <dl className={s.kv}>
            {q.qa_owner && (<><dt>Referente QA</dt><dd>{q.qa_owner}</dd></>)}
            {q.qa_notes && (<><dt>Note QA</dt><dd style={{ whiteSpace: "pre-wrap" }}>{q.qa_notes}</dd></>)}
          </dl>
        )}
        {qaOpen && <EaQaDialog component={c} open onOpenChange={setQaOpen} />}
      </section>
      <section className={s.dbSec}>
        <h4>Scheda tecnica</h4>
        <dl className={s.kv}>
          <dt>Area</dt><dd>{a?.name}</dd>
          <dt>Stack</dt><dd>{[...c.lang, ...c.fw].join(" · ") || "—"}</dd>
          {c.ingress && (<><dt>Ingress</dt><dd className={s.mono}>{c.ingress[0]}{c.ingress[1] ?? ""}</dd></>)}
          {c.owners.length > 0 && (<><dt>Owner GitHub</dt><dd className={s.deps}>{c.owners.map((o) => <span key={o} className={s.pill}>{o}</span>)}</dd></>)}
        </dl>
      </section>
      <EaRelations g={g} node={c} onOpen={onOpen} />
      <DataLakeProduced g={g} n={c} onOpen={onOpen} />
      {c.apis.length > 0 && (
        <section className={s.dbSec}>
          <h4>Contratti API</h4>
          <div className={s.links}>
            {c.apis.map((x) => (
              <a key={x.f} href={`${c.repo}/blob/HEAD/${x.f}`} target="_blank" rel="noopener noreferrer">
                <span className={s.sp}>OAS</span><span className={s.lt}>{x.t || x.f}</span>
              </a>
            ))}
          </div>
        </section>
      )}
      {(p.conf.length > 0 || c.confRepo.length > 0) && (
        <section className={s.dbSec}>
          <h4>Confluence</h4>
          <div className={s.links}>
            {c.confRepo.map((u) => (
              <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                <span className={s.sp}>README</span><span className={s.lt}>{u.replace("https://pagopa.atlassian.net/wiki/", "")}</span>
              </a>
            ))}
            {p.conf.slice(0, 5).map((x) => (
              <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer">
                <span className={s.sp}>{x.space}</span><span className={s.lt}>{x.title}</span>
              </a>
            ))}
          </div>
        </section>
      )}
      {c.workflows.length > 0 && (
        <section className={s.dbSec}>
          <h4>Pipeline GitHub Actions</h4>
          <div className={s.deps}>
            {c.workflows.map((w) => (
              <a key={w.f} href={`${c.repo}/blob/HEAD/.github/workflows/${w.f}`} target="_blank" rel="noopener noreferrer">
                {w.n ?? w.f}{w.cron ? " ⏱" : ""}
              </a>
            ))}
          </div>
        </section>
      )}
      {c.readme && (
        <section className={s.dbSec}>
          <h4>Dal README</h4>
          <div className={s.readme}>{c.readme}</div>
        </section>
      )}
    </>
  );
}

/** Infrastructure resources linked to the node: opens them in the Infrastruttura view. */
function InfraLinks({ nodeId, onInfra }: { nodeId: string; onInfra?: (id: string) => void }) {
  const { data } = useEaNodeDetail(nodeId);
  const items = data?.infra ?? [];
  if (!onInfra || items.length === 0) return null;
  return (
    <section className={s.dbSec}>
      <h4>Infrastruttura</h4>
      <div className={s.meta}>
        {items.slice(0, 40).map((r) => {
          const t = infraType(r.ltype);
          const Icon = t.icon;
          return (
            <button key={r.id} type="button" className={cx(s.btn, s.btnGhost)} title={`${t.label} · ${r.envs.join(", ")}`}
              onClick={() => onInfra(r.id)}>
              <Icon size={14} aria-hidden="true" /> {r.label}
            </button>
          );
        })}
        {items.length > 40 && <span className={s.no}>e altre {items.length - 40}</span>}
      </div>
    </section>
  );
}

function OtherBody({ g, n, onOpen, onInfra }: { g: EaGraph; n: EaNode; onOpen: (id: string) => void; onInfra?: (id: string) => void }) {
  return (
    <>
      <p style={{ margin: 0 }}>{n.desc}</p>
      <EaRelations g={g} node={n} onOpen={onOpen} />
      <InfraLinks nodeId={n.id} onInfra={onInfra} />
      <DataLakeFeeds g={g} n={n} onOpen={onOpen} />
    </>
  );
}

export function EaNodeDrawer({
  g,
  node,
  onClose,
  onOpen,
  goTo,
  onInfra,
}: {
  g: EaGraph;
  node: EaNode;
  onClose: () => void;
  onOpen: (id: string) => void;
  goTo: (id: string) => void;
  /** opens an infrastructure resource in the Infrastruttura view */
  onInfra?: (id: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !dialogOpen() && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [node.id, onClose]);

  const [editOpen, setEditOpen] = useState(false);
  const isComp = node.type === "component";
  const typeLabel = isComp
    ? node.kindLabel
    : node.type === "datastore"
      ? "Datastore"
      : node.type === "product"
        ? "Prodotto"
        : node.type === "dataset"
          ? "Dataset del Data Lake"
          : "Sistema esterno";
  return (
    <>
      <div className={s.scrim} onClick={() => !dialogOpen() && onClose()} aria-hidden="true" />
      <aside className={s.drawer} role="dialog" aria-modal="true" aria-label={`Dettaglio ${node.name}`}>
        <div className={s.dh}>
          <div style={{ minWidth: 0 }}>
            <div className={s.meta} style={{ marginBottom: 6 }}>
              <span className={s.pill}>{typeLabel}</span>
              {isComp && node.private && <span className={cx(s.pill, s.pillWarn)}>Repo privato</span>}
              {isComp && node.ns && <span className={cx(s.pill, s.mono)}>ns {node.ns}</span>}
            </div>
            <h2>{node.name}</h2>
            {(isComp || node.type === "dataset") && (
              <div className={s.mono} style={{ color: "var(--text-muted)", marginTop: 2 }}>{node.id}</div>
            )}
            {node.type !== "dataset" && (
              <Gate action="edit:ea_map">
                <button type="button" className={s.linkBtn} style={{ marginTop: 6 }} onClick={() => setEditOpen(true)}>
                  <Pencil size={12} /> Modifica scheda
                </button>
              </Gate>
            )}
          </div>
          <button ref={closeRef} type="button" className={s.x} aria-label="Chiudi" onClick={onClose}>✕</button>
        </div>
        <div className={s.db}>
          {isComp ? (
            <>
              <ComponentBody g={g} c={node} onOpen={onOpen} goTo={goTo} />
              <InfraLinks nodeId={node.id} onInfra={onInfra} />
            </>
          ) : node.type === "dataset" ? (
            <DatasetBody g={g} d={node} onOpen={onOpen} />
          ) : (
            <OtherBody g={g} n={node} onOpen={onOpen} onInfra={onInfra} />
          )}
          <EaHistory g={g} nodeId={node.id} />
        </div>
      </aside>
      {editOpen && <EaNodeDialog key={node.id} g={g} node={node} open onOpenChange={setEditOpen} />}
    </>
  );
}

