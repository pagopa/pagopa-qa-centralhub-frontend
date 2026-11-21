import type { TlStepKeyword } from "@/types/test-lifecycle";

/** Italian Gherkin step keywords (as in the backend index); E/Ma inherit the previous step. */
const KEYWORDS: [string, TlStepKeyword | null][] = [
  ["Dato", "given"],
  ["Data", "given"],
  ["Dati", "given"],
  ["Date", "given"],
  ["Quando", "when"],
  ["Allora", "then"],
  ["E", null],
  ["Ma", null],
];

const STEP_RE = new RegExp(`^(\\s*)(${KEYWORDS.map(([k]) => k).join("|")})\\s(.*)$`);

function keywordOf(line: string): { word: string; keyword: TlStepKeyword | null } | null {
  const m = STEP_RE.exec(line);
  if (!m) return null;
  const entry = KEYWORDS.find(([k]) => k === m[2]);
  return entry ? { word: entry[0], keyword: entry[1] } : null;
}

export interface StepQuery {
  keyword: TlStepKeyword | null;
  query: string;
  lineStart: number;
}

/**
 * The step being typed on the caret's line: its keyword (E/Ma inherit from the
 * closest previous step line) and the text after the keyword up to the caret.
 * Null when the line is not a step line or the keyword is not complete yet.
 */
export function currentStepQuery(text: string, caret: number): StepQuery | null {
  const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
  const line = text.slice(lineStart, caret);
  const m = STEP_RE.exec(line);
  if (!m) return null;
  let keyword = keywordOf(line)?.keyword ?? null;
  if (keyword === null) {
    const previous = text.slice(0, lineStart).split("\n").reverse();
    for (const prev of previous) {
      const found = keywordOf(prev);
      if (found?.keyword) {
        keyword = found.keyword;
        break;
      }
    }
  }
  return { keyword, query: m[3], lineStart };
}

/** Replaces what follows the keyword on the caret's line with `suggestion`. */
export function applySuggestion(
  text: string,
  caret: number,
  suggestion: string,
): { text: string; caret: number } {
  const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
  const nl = text.indexOf("\n", caret);
  const lineEnd = nl === -1 ? text.length : nl;
  const line = text.slice(lineStart, lineEnd);
  const m = STEP_RE.exec(line);
  if (!m) return { text, caret };
  const replaced = `${m[1]}${m[2]} ${suggestion}`;
  return {
    text: text.slice(0, lineStart) + replaced + text.slice(lineEnd),
    caret: lineStart + replaced.length,
  };
}
