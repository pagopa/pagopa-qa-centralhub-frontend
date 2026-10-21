import { ChevronDown, ExternalLink } from "lucide-react";

const DOCUMENTATION_URL =
  "https://pagopa.atlassian.net/wiki/spaces/QDP/pages/3291218056/Documentazione+Tecnica";
const NAMING_CONVENTION_URL =
  "https://pagopa.atlassian.net/wiki/spaces/QDP/pages/2897641568/GDR-003+Naming+Convention";

const CATEGORIES = [
  ["fld", "Puntuale"],
  ["ent", "Intra-entità"],
  ["xref", "Cross-entità"],
];

const DIMENSIONS = [
  ["acc", "Accuratezza"],
  ["cmp", "Completezza"],
  ["cns", "Consistenza"],
  ["tim", "Tempestività"],
  ["unq", "Unicità"],
  ["vld", "Validità"],
];

const PRACTICAL_EXAMPLES = [
  {
    category: "fld · Puntuale",
    dimension: "vld · Validità",
    context: "createddate",
    rule: "date_format",
    identifier: "fld__vld__createddate__date_format",
    usage: "pagopa.silver_touchpoints.createddate",
    source: "Esempio SODA",
  },
  {
    category: "ent · Intra-entità",
    dimension: "cns · Consistenza",
    context: "validity_dates",
    rule: "chronological_order",
    identifier: "ent__cns__validity_dates__chronological_order",
    usage: "Verifica l'ordine delle date di validità nello stesso record",
    source: "Esempio illustrativo",
  },
  {
    category: "xref · Cross-entità",
    dimension: "cns · Consistenza",
    context: "payment_option_transfer",
    rule: "importi_coerenti",
    identifier: "xref__cns__payment_option_transfer__importi_coerenti",
    usage: "Confronta gli importi tra payment_option e transfer",
    source: "Esempio da GDR-003",
  },
];

export function DqNamingGuide() {
  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] font-medium text-text-dim hover:bg-hover">
          <span>Composizione degli identificativi DQ</span>
          <ChevronDown size={15} className="shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border px-4 py-4">
          <p className="mb-3 text-[13px] text-text-dim">
            Formato: <code className="font-mono text-text">&lt;categoria&gt;__&lt;dimensione&gt;__&lt;contesto&gt;__&lt;regola&gt;</code>
          </p>

          <div className="grid gap-4 text-[12px] sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-semibold text-text">Categoria</h2>
              <dl className="grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1">
                {CATEGORIES.map(([code, label]) => (
                  <div className="contents" key={code}>
                    <dt className="font-mono text-text">{code}</dt>
                    <dd className="text-text-dim">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h2 className="mb-2 font-semibold text-text">Dimensione</h2>
              <dl className="grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1">
                {DIMENSIONS.map(([code, label]) => (
                  <div className="contents" key={code}>
                    <dt className="font-mono text-text">{code}</dt>
                    <dd className="text-text-dim">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-3 text-[12px] text-text-dim">
            <p>
              Sul controllo per dominio, <code className="font-mono text-text">check_name</code> identifica il check concreto
              e deve coincidere esattamente con il check_name in SODA, per esempio{" "}
              <code className="font-mono text-text">fld__vld__createddate__date_format</code>. Per lo stato Attivo è
              richiesto anche il link diretto al check SODA.
            </p>
            <section className="mt-4 border-t border-border pt-3">
              <h2 className="font-semibold text-text">Esempi pratici</h2>
              <div className="mt-1 divide-y divide-border">
                {PRACTICAL_EXAMPLES.map((example) => (
                  <article className="py-3" key={example.identifier}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <code className="break-all font-mono text-[12px] text-text">{example.identifier}</code>
                      <span className="shrink-0 text-[11px] text-text-muted">{example.source}</span>
                    </div>
                    <p className="mt-1 text-text-dim">{example.usage}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                      <div>
                        <dt className="text-text-muted">Categoria</dt>
                        <dd className="text-text">{example.category}</dd>
                      </div>
                      <div>
                        <dt className="text-text-muted">Dimensione</dt>
                        <dd className="text-text">{example.dimension}</dd>
                      </div>
                      <div>
                        <dt className="text-text-muted">Contesto</dt>
                        <dd className="break-words font-mono text-text">{example.context}</dd>
                      </div>
                      <div>
                        <dt className="text-text-muted">Regola</dt>
                        <dd className="break-words font-mono text-text">{example.rule}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
            <a
              href={DOCUMENTATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[var(--accent)] underline underline-offset-2 hover:text-text"
            >
              Documentazione tecnica <ExternalLink size={13} />
            </a>
            <a
              href={NAMING_CONVENTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[var(--accent)] underline underline-offset-2 hover:text-text"
            >
              GDR-003 Naming Convention <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </details>
    </section>
  );
}