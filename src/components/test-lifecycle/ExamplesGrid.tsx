"use client";

import { Plus, X } from "lucide-react";
import type { TlExamples } from "@/types/test-lifecycle";

const CELL_CLASS =
  "w-full min-w-[80px] bg-transparent px-2 py-1 font-mono text-[12px] text-text outline-none focus:bg-hover";

const ICON_BUTTON_CLASS =
  "inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-accent transition-colors";

export const EMPTY_EXAMPLES: TlExamples = { headers: ["parametro"], rows: [[""]] };

/** Editable Examples table for a scenario outline: headers and rows, add/remove row and column. */
export function ExamplesGrid({
  value,
  onChange,
  onBlur,
  readOnly = false,
}: {
  value: TlExamples;
  onChange?: (value: TlExamples) => void;
  onBlur?: () => void;
  readOnly?: boolean;
}) {
  const { headers, rows } = value;
  const emit = (next: TlExamples) => onChange?.(next);

  const setHeader = (c: number, text: string) =>
    emit({ headers: headers.map((h, i) => (i === c ? text : h)), rows });
  const setCell = (r: number, c: number, text: string) =>
    emit({
      headers,
      rows: rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? text : cell)) : row)),
    });
  const addRow = () => emit({ headers, rows: [...rows, headers.map(() => "")] });
  const removeRow = (r: number) => emit({ headers, rows: rows.filter((_, i) => i !== r) });
  const addColumn = () =>
    emit({ headers: [...headers, `colonna${headers.length + 1}`], rows: rows.map((row) => [...row, ""]) });
  const removeColumn = (c: number) =>
    emit({
      headers: headers.filter((_, i) => i !== c),
      rows: rows.map((row) => row.filter((_, j) => j !== c)),
    });

  return (
    <div
      className="flex flex-col gap-1.5"
      onBlur={(e) => {
        // Only when focus leaves the whole grid, not while moving between cells.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onBlur?.();
      }}
    >
      <span className="text-xs font-medium text-text-dim">Esempi</span>
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border-strong">
        <table className="border-collapse text-left">
          <thead>
            <tr className="bg-hover">
              {headers.map((h, c) => (
                <th key={c} className="border-b border-r border-border p-0 font-normal">
                  <div className="flex items-center">
                    <input
                      aria-label={`Intestazione colonna ${c + 1}`}
                      className={`${CELL_CLASS} font-semibold`}
                      value={h}
                      readOnly={readOnly}
                      onChange={(e) => setHeader(c, e.target.value)}
                    />
                    {!readOnly && headers.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Rimuovi colonna ${c + 1}`}
                        className={`${ICON_BUTTON_CLASS} px-1`}
                        onClick={() => removeColumn(c)}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {!readOnly && <th className="border-b border-border w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {headers.map((_, c) => (
                  <td key={c} className="border-b border-r border-border p-0">
                    <input
                      aria-label={`Riga ${r + 1}, colonna ${c + 1}`}
                      className={CELL_CLASS}
                      value={row[c] ?? ""}
                      readOnly={readOnly}
                      onChange={(e) => setCell(r, c, e.target.value)}
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="border-b border-border px-1 text-center">
                    <button
                      type="button"
                      aria-label={`Rimuovi riga ${r + 1}`}
                      className={ICON_BUTTON_CLASS}
                      onClick={() => removeRow(r)}
                    >
                      <X size={12} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="flex gap-3">
          <button type="button" className={ICON_BUTTON_CLASS} onClick={addRow}>
            <Plus size={12} /> Riga
          </button>
          <button type="button" className={ICON_BUTTON_CLASS} onClick={addColumn}>
            <Plus size={12} /> Colonna
          </button>
        </div>
      )}
    </div>
  );
}
