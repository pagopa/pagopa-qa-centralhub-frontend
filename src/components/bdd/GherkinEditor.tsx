"use client";

import { useRef } from "react";

const KEYWORD_COLORS: Record<string, string> = {
  "Feature:": "var(--accent)",
  "Funzionalità:": "var(--accent)",
  "Scenario:": "var(--info)",
  "Schema dello scenario:": "var(--info)",
  "Scenario Outline:": "var(--info)",
  "Given": "var(--success)",
  "Dato": "var(--success)",
  "Dati": "var(--success)",
  "When": "var(--warning)",
  "Quando": "var(--warning)",
  "Then": "var(--accent)",
  "Allora": "var(--accent)",
  "And": "var(--text-dim)",
  "E": "var(--text-dim)",
  "But": "var(--text-dim)",
  "Ma": "var(--text-dim)",
  "Examples:": "var(--info)",
  "Esempi:": "var(--info)",
};

function highlightLine(line: string): React.ReactNode {
  const trimmed = line.trimStart();
  for (const [kw, color] of Object.entries(KEYWORD_COLORS)) {
    if (trimmed.startsWith(kw)) {
      return <span style={{ color }}>{line}</span>;
    }
  }
  if (trimmed.startsWith("| ")) {
    return <span style={{ color: "var(--info)" }}>{line}</span>;
  }
  if (trimmed.startsWith("#")) {
    return <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{line}</span>;
  }
  if (trimmed.startsWith("@")) {
    return <span style={{ color: "var(--warning)" }}>{line}</span>;
  }
  return <>{line}</>;
}

interface GherkinEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: number;
}

export function GherkinEditor({ value, onChange, readOnly = false, height = 320 }: GherkinEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = value.split("\n");

  const syncScroll = () => {
    const ta = textareaRef.current;
    const overlay = ta?.previousElementSibling as HTMLElement | null;
    if (ta && overlay) overlay.scrollTop = ta.scrollTop;
  };

  return (
    <div
      className="relative flex rounded-[var(--radius)] border border-border overflow-hidden"
      style={{ height, fontFamily: "var(--font-geist-mono)", fontSize: 13 }}
    >
      {/* Line numbers */}
      <div
        className="select-none text-right text-text-muted bg-subtle border-r border-border overflow-hidden shrink-0"
        style={{ padding: "10px 8px", lineHeight: "20px", minWidth: 40 }}
      >
        {lines.map((_, i) => (
          <div key={i} style={{ height: 20 }}>{i + 1}</div>
        ))}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        className="flex-1 outline-none resize-none"
        style={{
          padding: "10px 12px",
          lineHeight: "20px",
          caretColor: "var(--accent)",
          background: readOnly ? "var(--subtle)" : "var(--surface)",
          color: "var(--text)",
          fontFamily: "var(--font-geist-mono)",
          fontSize: 13,
        }}
      />
    </div>
  );
}
