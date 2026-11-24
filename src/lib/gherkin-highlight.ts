export type HighlightKind = "keyword" | "tag" | "comment" | "text";

export interface HighlightSpan {
  text: string;
  kind: HighlightKind;
}

/** Longest first, so "Dato che" wins over "Dato". Matching is case sensitive, like Gherkin. */
const KEYWORDS = [
  "Dato che",
  "Dato",
  "Quando",
  "Allora",
  "E",
  "Ma",
  "Given",
  "When",
  "Then",
  "And",
  "But",
  "Scenario",
  "Contesto",
  "Esempi",
  "Examples",
  "Background",
].sort((a, b) => b.length - a.length);

const TAG = /@\S+/g;

function splitTags(text: string): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    const start = match.index ?? 0;
    if (start > last) spans.push({ text: text.slice(last, start), kind: "text" });
    spans.push({ text: match[0], kind: "tag" });
    last = start + match[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last), kind: "text" });
  return spans;
}

/** Splits one Gherkin line into coloured spans; the spans always concatenate back to `line`. */
export function highlightLine(line: string): HighlightSpan[] {
  if (line === "") return [];
  const indent = line.length - line.trimStart().length;
  const body = line.slice(indent);
  if (body.startsWith("#")) return [{ text: line, kind: "comment" }];

  const spans: HighlightSpan[] = [];
  let rest = body;
  if (indent > 0) spans.push({ text: line.slice(0, indent), kind: "text" });
  const keyword = KEYWORDS.find((k) => body.startsWith(k) && (body.length === k.length || /\s/.test(body[k.length])));
  if (keyword) {
    spans.push({ text: keyword, kind: "keyword" });
    rest = body.slice(keyword.length);
  }
  spans.push(...splitTags(rest));
  // Merge the indentation into the first text span so plain lines stay a single span.
  if (spans.length >= 2 && spans[0].kind === "text" && spans[1].kind === "text") {
    spans.splice(0, 2, { text: spans[0].text + spans[1].text, kind: "text" });
  }
  return spans;
}
