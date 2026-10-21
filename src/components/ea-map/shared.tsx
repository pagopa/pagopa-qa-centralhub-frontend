import { Fragment } from "react";
import type { EaKb } from "@/types/ea";
import type { ProductStats } from "@/lib/ea-map/graph";
import s from "./ea-map.module.css";

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Maturity color token for a 0..5 score (rounded). */
export function qc(score: number): string {
  const v = Math.max(0, Math.min(5, Math.round(score)));
  return `var(--ea-q${v})`;
}

export function riskClass(value: string): string {
  const tail = value.split("→").pop() ?? value;
  return cx(s.rk, tail === "HIGH" && s.rkHIGH, tail === "MEDIUM" && s.rkMEDIUM, tail === "LOW" && s.rkLOW);
}

export interface Crumb {
  label: string;
  onClick?: () => void;
}

const LEVELS = ["Piattaforma", "Area", "Prodotto", "Componente"];

export function Crumbs({ path, level }: { path: Crumb[]; level: number }) {
  return (
    <nav className={s.crumbs} aria-label="Percorso">
      {path.map((p, i) =>
        i < path.length - 1 ? (
          <Fragment key={p.label}>
            <button type="button" onClick={p.onClick}>
              {p.label}
            </button>
            <span className={s.sep}>›</span>
          </Fragment>
        ) : (
          <span key={p.label} className={s.here}>
            {p.label}
          </span>
        ),
      )}
      <div className={s.alt} aria-hidden="true">
        {LEVELS.map((l, i) => (
          <span key={l} className={i === level ? s.altOn : undefined}>
            {l}
          </span>
        ))}
      </div>
    </nav>
  );
}

export function QaLegend() {
  return (
    <div className={s.legend}>
      <span>Maturità test (lente QA):</span>
      <span className={s.qlegend}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <b key={i} style={{ background: qc(i) }} title={String(i)} />
        ))}
      </span>
      <span>0 nessun test → 5 unit + integrazione + suite centrale + performance + NRT</span>
    </div>
  );
}

export function Footer({ kb }: { kb: EaKb }) {
  const src = kb.meta.sources ?? {};
  return (
    <div className={s.foot}>
      {kb.meta.generated && <span>KB generata il {kb.meta.generated}</span>}
      <span>{src.github_repos ?? 0} repository</span>
      {src.confluence_pages ? (
        <span>
          {src.confluence_pages.toLocaleString("it-IT")} pagine Confluence indicizzate
          {src.confluence_spaces?.length ? ` (${src.confluence_spaces.join(", ")})` : ""}
        </span>
      ) : null}
      {kb.meta.tas && (
        <span>
          TAS:{" "}
          <a href={kb.meta.tas.repo} target="_blank" rel="noopener noreferrer">
            pagopa-platform-integration-test
          </a>
        </span>
      )}
    </div>
  );
}

export function QaPills({ stats }: { stats: ProductStats }) {
  const b = stats.base || 1;
  return (
    <>
      <span className={cx(s.pill, stats.it / b >= 0.5 ? s.pillOk : s.pillWarn)}>
        Integrazione {stats.it}/{stats.base}
      </span>
      {stats.tas > 0 && <span className={cx(s.pill, s.pillOk)}>TAS {stats.tas}</span>}
      {stats.nrt > 0 && <span className={cx(s.pill, s.pillOk)}>NRT {stats.nrt}</span>}
      {stats.perf > 0 && <span className={s.pill}>Perf {stats.perf}</span>}
    </>
  );
}

export function ScoreBar({ value }: { value: number }) {
  const r = Math.round(value);
  return (
    <span className={s.seg}>
      {[1, 2, 3, 4, 5].map((k) => (
        <i key={k} style={k <= r ? { background: qc(r), borderColor: "transparent" } : undefined} />
      ))}
    </span>
  );
}
