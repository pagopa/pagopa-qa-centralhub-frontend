import type { ReactNode } from "react";

/** Dove avviene un passo: decide il colore dell'etichetta. */
export type FlowPlace = "QA Hub" | "GitHub" | "Run NRT" | "Jira" | "Confluence";

const PLACE_STYLE: Record<FlowPlace, { color: string; bg: string }> = {
  "QA Hub": { color: "var(--accent)", bg: "var(--accent-soft)" },
  GitHub: { color: "var(--text-dim)", bg: "var(--neutral-soft)" },
  "Run NRT": { color: "var(--success)", bg: "var(--success-soft)" },
  Jira: { color: "var(--info)", bg: "var(--info-soft)" },
  Confluence: { color: "var(--warning)", bg: "var(--warning-soft)" },
};

export interface FlowStep {
  place: FlowPlace;
  title: string;
  /** Esempio concreto del passo (testo, codice, valori). */
  example?: ReactNode;
}

/**
 * Diagramma di flusso con esempio: passi in ordine, ognuno con il luogo in cui avviene
 * (QA Hub, GitHub, Run NRT…), un titolo e un esempio concreto. È una lista ordinata, quindi
 * si legge bene anche con lo screen reader e si adatta agli schermi stretti.
 */
export function ExampleFlow({ title, steps }: { title: string; steps: FlowStep[] }) {
  return (
    <figure className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-[var(--bg)] p-3">
      <figcaption className="text-[12px] font-semibold uppercase text-text-muted" style={{ letterSpacing: ".06em" }}>
        {title}
      </figcaption>
      <ol className="flex flex-wrap items-stretch gap-y-2" aria-label={title}>
        {steps.map((step, i) => {
          const style = PLACE_STYLE[step.place];
          return (
            <li key={`${step.title}-${i}`} className="flex items-stretch">
              <div className="flex w-[170px] flex-col gap-1 rounded-[var(--radius-sm)] border border-border bg-surface p-2">
                <span
                  className="w-fit rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                  style={{ color: style.color, background: style.bg }}
                >
                  {step.place}
                </span>
                <span className="text-[12.5px] font-semibold leading-snug text-text">
                  <span className="text-text-muted">{i + 1}.</span> {step.title}
                </span>
                {step.example && <span className="text-[11.5px] leading-snug text-text-dim break-words">{step.example}</span>}
              </div>
              {i < steps.length - 1 && (
                <span aria-hidden className="flex items-center px-1.5 text-text-muted">→</span>
              )}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

/** Esempio di codice nei diagrammi e nel testo della guida. */
export function Mono({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[11.5px] text-text">{children}</code>;
}
