"use client";

import { Fragment, useState } from "react";
import { Check, Copy } from "lucide-react";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { useTlPreview } from "@/hooks/useTestLifecycle";
import { HIGHLIGHT_COLOR, highlightLine } from "@/lib/gherkin-highlight";

/** "Anteprima file" tab: the generated .feature file, read-only, with a copy button. */
export function FilePreview({ featureId, revisionId }: { featureId: string; revisionId: string | undefined }) {
  const { data, isLoading, isError } = useTlPreview(featureId, revisionId);
  const [copied, setCopied] = useState(false);

  if (isLoading) return <p className="text-[13px] text-text-muted">Caricamento anteprima…</p>;
  if (isError || !data) return <p role="alert" className="text-danger text-[13px]">Anteprima non disponibile.</p>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.file);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => void copy()}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copiato" : "Copia"}
        </button>
      </div>
      {data.errors.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-[12px]" style={{ color: "var(--danger)" }}>
          {data.errors.map((e, i) => (
            <li key={i}>
              {e.scenario_tag ? `${e.scenario_tag} · ` : ""}Riga {e.line}: {e.message}
            </li>
          ))}
        </ul>
      )}
      <pre
        aria-label="Anteprima file"
        className="overflow-auto rounded-[var(--radius-sm)] border border-border bg-surface p-3 font-mono text-[12.5px] leading-5 text-text whitespace-pre"
      >
        {data.file.split("\n").map((line, i, all) => (
          <Fragment key={i}>
            {highlightLine(line).map((span, j) => (
              <span key={j} data-kind={span.kind} style={{ color: HIGHLIGHT_COLOR[span.kind] }}>
                {span.text}
              </span>
            ))}
            {i < all.length - 1 ? "\n" : ""}
          </Fragment>
        ))}
      </pre>
    </div>
  );
}
