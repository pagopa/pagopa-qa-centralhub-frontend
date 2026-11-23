"use client";

import { useState } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { useTlHistory, useTlVersion } from "@/hooks/useTestLifecycle";
import { lineDiff, tlEventLabel } from "@/lib/test-lifecycle";
import type { TlHistoryItem } from "@/types/test-lifecycle";

function snapshotFile(snapshot: Record<string, unknown> | undefined): string | null {
  const file = snapshot?.file;
  return typeof file === "string" ? file : null;
}

function DiffView({ featureId, fromId, toId }: { featureId: string; fromId: string; toId: string }) {
  const a = useTlVersion(featureId, fromId);
  const b = useTlVersion(featureId, toId);
  if (a.isLoading || b.isLoading) return <p className="text-[13px] text-text-muted">Caricamento diff…</p>;
  const fa = snapshotFile(a.data?.snapshot);
  const fb = snapshotFile(b.data?.snapshot);
  if (a.isError || b.isError || fa === null || fb === null) {
    return <p role="alert" className="text-danger text-[13px]">Diff non disponibile.</p>;
  }
  const lines = lineDiff(fa, fb);
  return (
    <pre
      aria-label="Diff fra versioni"
      className="overflow-auto rounded-[var(--radius-sm)] border border-border bg-surface p-3 font-mono text-[12.5px] leading-5"
    >
      {lines.map((l, i) => (
        <div
          key={i}
          data-diff={l.type}
          className="whitespace-pre"
          style={
            l.type === "add"
              ? { background: "var(--success-soft, rgba(34,197,94,.15))" }
              : l.type === "del"
                ? { background: "var(--danger-soft, rgba(239,68,68,.15))" }
                : undefined
          }
        >
          {l.type === "add" ? "+ " : l.type === "del" ? "- " : "  "}
          {l.text}
        </div>
      ))}
    </pre>
  );
}

function VersionFile({ featureId, versionId }: { featureId: string; versionId: string }) {
  const { data, isLoading, isError } = useTlVersion(featureId, versionId);
  if (isLoading) return <p className="text-[13px] text-text-muted">Caricamento versione…</p>;
  const file = snapshotFile(data?.snapshot);
  if (isError || file === null) return <p role="alert" className="text-danger text-[13px]">File non disponibile.</p>;
  return (
    <pre
      aria-label="File della versione"
      className="overflow-auto rounded-[var(--radius-sm)] border border-border bg-surface p-3 font-mono text-[12.5px] leading-5 whitespace-pre"
    >
      {file}
    </pre>
  );
}

/** "Storico" tab: events and saved versions; view a version's file or diff two versions. */
export function HistoryPanel({ featureId }: { featureId: string }) {
  const { data: items = [], isLoading, isError } = useTlHistory(featureId);
  const [viewing, setViewing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  if (isLoading) return <p className="text-[13px] text-text-muted">Caricamento storico…</p>;
  if (isError) return <p role="alert" className="text-danger text-[13px]">Storico non disponibile.</p>;
  if (items.length === 0) return <p className="text-[13px] text-text-muted">Nessun evento.</p>;

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 2 ? [cur[1], id] : [...cur, id]));

  // Chronological order for the diff: older version first.
  const ordered = (ids: string[]) =>
    [...ids].sort((x, y) => {
      const ax = items.find((i) => i.version_id === x)?.at ?? "";
      const ay = items.find((i) => i.version_id === y)?.at ?? "";
      return ax < ay ? -1 : ax > ay ? 1 : 0;
    });

  const label = (it: TlHistoryItem) => (it.kind === "version" ? "Versione salvata" : tlEventLabel(it.action));

  return (
    <div className="flex flex-col gap-4">
      <ul aria-label="Storico" className="flex flex-col gap-2">
        {items.map((it, i) => (
          <li key={`${it.at}-${i}`} className="flex items-center gap-2 flex-wrap rounded-[var(--radius)] border border-border bg-surface p-3 text-[13px]">
            {it.kind === "version" && it.version_id && (
              <input
                type="checkbox"
                aria-label={`Seleziona versione del ${new Date(it.at).toLocaleString("it-IT")}`}
                checked={selected.includes(it.version_id)}
                onChange={() => toggle(it.version_id as string)}
              />
            )}
            <span className="font-medium">{label(it)}</span>
            <span className="text-[12px] text-text-muted">{it.actor ?? "sistema"}</span>
            <span className="text-[12px] text-text-muted">{new Date(it.at).toLocaleString("it-IT")}</span>
            {it.kind === "version" && it.version_id && (
              <button
                type="button"
                className={`${SECONDARY_BUTTON_CLASS} ml-auto`}
                onClick={() => setViewing(viewing === it.version_id ? null : it.version_id)}
              >
                Vedi file
              </button>
            )}
          </li>
        ))}
      </ul>
      {selected.length < 2 && (
        <p className="text-[12px] text-text-muted">Seleziona due versioni per confrontarle.</p>
      )}
      {selected.length === 2 && (
        <DiffView featureId={featureId} fromId={ordered(selected)[0]} toId={ordered(selected)[1]} />
      )}
      {viewing && <VersionFile featureId={featureId} versionId={viewing} />}
    </div>
  );
}
