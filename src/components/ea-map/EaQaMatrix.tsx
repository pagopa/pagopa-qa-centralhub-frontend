"use client";

import { useMemo, useState } from "react";
import type { EaComponent } from "@/types/ea";
import { KIND_BADGE, areaOf, isRuntime, productOf, shortName, type EaGraph } from "@/lib/ea-map/graph";
import { Crumbs, Footer, cx, qc } from "./shared";
import s from "./ea-map.module.css";

type FilterKey = "runtime" | "nointeg" | "tas" | "nrt" | "noperf";
type SortKey = "name" | "prod" | "area" | "kind" | "unit" | "it" | "tas" | "nrt" | "perf" | "score";

const FILTERS: [FilterKey, string][] = [
  ["runtime", "Solo runtime"],
  ["nointeg", "Senza integrazione"],
  ["tas", "Coperti da TAS"],
  ["nrt", "In NRT"],
  ["noperf", "Senza performance"],
];
const COLS: [SortKey, string][] = [
  ["name", "Componente"],
  ["prod", "Prodotto"],
  ["area", "Area"],
  ["kind", "Tipo"],
  ["unit", "Unit"],
  ["it", "Feature IT"],
  ["tas", "TAS"],
  ["nrt", "NRT"],
  ["perf", "Perf"],
  ["score", "Maturità"],
];

export function EaQaMatrix({ g, goTo, openNode }: { g: EaGraph; goTo: (id: string | null) => void; openNode: (id: string) => void }) {
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set(["runtime"]));
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: "score", d: 1 });

  const rows = useMemo(() => {
    let r = g.components.slice();
    if (filters.has("runtime")) r = r.filter(isRuntime);
    if (filters.has("nointeg")) r = r.filter((c) => !(c.qa.it_repo > 0 || c.qa.it_wf || c.qa.nodo_bdd || c.qa.tas));
    if (filters.has("tas")) r = r.filter((c) => c.qa.tas);
    if (filters.has("nrt")) r = r.filter((c) => c.qa.nrt.length > 0);
    if (filters.has("noperf")) r = r.filter((c) => !c.qa.perf_repo);
    const val = (c: EaComponent): string | number => {
      switch (sort.k) {
        case "name": return c.name;
        case "prod": return productOf(g, c).name;
        case "area": return areaOf(g, c)?.name ?? "";
        case "kind": return c.kind;
        case "unit": return c.qa.unit;
        case "it": return c.qa.it_repo;
        case "tas": return Number(c.qa.tas);
        case "nrt": return c.qa.nrt.length;
        case "perf": return Number(c.qa.perf_repo);
        default: return c.qa.score;
      }
    };
    return r.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const cmp = typeof x === "string" ? x.localeCompare(String(y)) : x - Number(y);
      return cmp * sort.d || a.name.localeCompare(b.name);
    });
  }, [g, filters, sort]);

  const toggle = (k: FilterKey) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <>
      <Crumbs path={[{ label: "Piattaforma pagoPA", onClick: () => goTo(null) }, { label: "Matrice QA" }]} level={-1} />
      <h2 className={s.h2}>Matrice di copertura QA</h2>
      <p className={s.intro}>
        Ogni componente con i segnali di test ricavati dai repository e dalle suite centrali. Il perimetro &quot;Sotto QA&quot; del
        Centro di Competenza sarà compilabile dalla scheda del componente.
      </p>
      <div className={s.mxTools}>
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" className={s.fbtn} aria-pressed={filters.has(k)} onClick={() => toggle(k)}>{l}</button>
        ))}
        <span className={s.no} style={{ marginLeft: "auto" }}>{rows.length} componenti</span>
      </div>
      <div className={s.tblWrap}>
        <table className={s.tbl}>
          <thead>
            <tr>
              {COLS.map(([k, l]) => (
                <th key={k} aria-sort={sort.k === k ? (sort.d > 0 ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => setSort((p) => (p.k === k ? { k, d: p.d === 1 ? -1 : 1 } : { k, d: 1 }))}>
                    {l}{sort.k === k ? (sort.d > 0 ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={s.row} onClick={() => openNode(c.id)}>
                <td><b>{c.name}</b><div className={s.mono} style={{ color: "var(--text-muted)" }}>{c.id}</div></td>
                <td>{shortName(productOf(g, c).name)}</td>
                <td>{areaOf(g, c)?.name}</td>
                <td><span className={s.kb}>{KIND_BADGE[c.kind]}</span></td>
                <td className={s.num}>{c.qa.unit || <span className={s.no}>0</span>}</td>
                <td className={s.num}>{c.qa.nodo_bdd ? "1.5k+" : c.qa.it_repo || (c.qa.it_wf ? "wf" : <span className={s.no}>0</span>)}</td>
                <td>{c.qa.tas ? <span className={s.yes} title={c.qa.central.join(", ")}>✓</span> : <span className={s.no}>–</span>}</td>
                <td>{c.qa.nrt.length ? <span className={s.yes}>{c.qa.nrt.join(", ")}</span> : <span className={s.no}>–</span>}</td>
                <td>{c.qa.perf_repo ? <span className={s.yes}>✓</span> : <span className={s.no}>–</span>}</td>
                <td><span className={cx(s.sbox)} style={{ background: qc(c.qa.score) }}>{c.qa.score}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer kb={g.kb} />
    </>
  );
}
