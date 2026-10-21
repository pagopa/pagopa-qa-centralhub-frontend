"use client";

/* «Live»: what the automated tests said in the last days, on the map. The ring colors are
   painted by EaMapView; this card tells the story: counts, the latest runs, what is not
   linked to the map yet. */

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2, MapPin } from "lucide-react";
import type { EaLive, EaLiveEnv, EaLiveStatus } from "@/types/ea";
import { ago } from "@/lib/ea-map/live";
import type { EaGraph } from "@/lib/ea-map/graph";
import { cx } from "./shared";
import s from "./ea-assist.module.css";

const ENVS: EaLiveEnv[] = ["DEV", "UAT", "PROD"];
const STATUS_LABEL: Record<EaLiveStatus, string> = { passed: "passata", partial: "parziale", failed: "fallita", none: "nessun dato" };

interface Props {
  g: EaGraph;
  env: EaLiveEnv;
  onEnv: (env: EaLiveEnv) => void;
  data: EaLive | undefined;
  loading: boolean;
  error: boolean;
  onShow: (ids: string[]) => void;
}

export function EaLivePanel({ g, env, onEnv, data, loading, error, onShow }: Props) {
  const [open, setOpen] = useState(true);
  const names = (ids: string[]) => ids.map((id) => g.byId.get(id)?.name ?? id).join(", ");
  return (
    <section className={s.live} aria-label="Esiti dei test in tempo reale">
      <header className={s.liveHead}>
        <span className={s.liveDot} aria-hidden="true" />
        <b>Live</b>
        <select value={env} onChange={(e) => onEnv(e.target.value as EaLiveEnv)} aria-label="Ambiente">
          {ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        {data && (
          <span className={s.liveCounts}>
            <span className={s.okc} title="Ultimo esito passato">✓ {data.counts.passed}</span>
            {data.counts.partial > 0 && <span className={s.midc} title="Ultimo esito parziale">◐ {data.counts.partial}</span>}
            <span className={s.koc} title="Ultimo esito fallito">✗ {data.counts.failed}</span>
          </span>
        )}
        <button type="button" className={s.liveToggle} onClick={() => setOpen((v) => !v)} aria-label={open ? "Riduci" : "Espandi"}>
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
        </button>
      </header>
      {open && (
        <div className={s.liveBody}>
          {loading && <p className={s.dim}><Loader2 aria-hidden="true" className={s.spin} /> Carico gli esiti…</p>}
          {error && <p className={s.dim}>Esiti non disponibili in questo momento.</p>}
          {data && data.feed.length === 0 && (
            <p className={s.dim}>Nessuna run in {data.env} negli ultimi {data.days} giorni.</p>
          )}
          {data && data.feed.length > 0 && (
            <>
              <p className={s.liveSub}>Ultime run · aggiornato {ago(data.generated_at)}</p>
              <ul className={s.feed}>
                {data.feed.map((f, i) => (
                  <li key={`${f.test_object}-${f.at}-${i}`} className={cx(s.feedItem, s[`fi_${f.status}`])}>
                    <span className={s.fiDot} aria-label={STATUS_LABEL[f.status]} />
                    <div className={s.fiMain}>
                      <b>{f.test_object}</b>
                      <span className={s.dim}>
                        {f.trigger ?? "run"} · {ago(f.at)}
                        {f.status === "failed" ? ` · ${f.failed}/${f.total} scenari ko` : ""}
                      </span>
                      {f.nodes.length > 0 && <span className={s.fiNodes}>{names(f.nodes)}</span>}
                    </div>
                    <div className={s.fiActions}>
                      {f.nodes.length > 0 && (
                        <button type="button" onClick={() => onShow(f.nodes)} title="Mostra sulla mappa"><MapPin aria-hidden="true" /></button>
                      )}
                      {f.allure_url && (
                        <a href={f.allure_url} target="_blank" rel="noopener noreferrer" title="Report Allure"><ExternalLink aria-hidden="true" /></a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {data.unmapped.length > 0 && (
                <details className={s.more}>
                  <summary>Non collegati alla mappa · {data.unmapped.length}</summary>
                  <p className={s.dim}>{data.unmapped.join(", ")}</p>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
