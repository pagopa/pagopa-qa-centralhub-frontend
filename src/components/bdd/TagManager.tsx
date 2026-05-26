"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

const PREDEFINED_TAGS = ["@happy-path", "@negative", "@edge-case", "@smoke", "@regression"];

interface TagManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagManager({ tags, onChange }: TagManagerProps) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const addTag = (tag: string) => {
    const t = tag.startsWith("@") ? tag : `@${tag}`;
    if (!tags.includes(t)) onChange([...tags, t]);
    setInput("");
    setShowDropdown(false);
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const availablePredefined = PREDEFINED_TAGS.filter((t) => !tags.includes(t));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono"
            style={{ background: "color-mix(in oklch, var(--warning) 15%, transparent)", color: "var(--warning)" }}
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:opacity-70">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>

      <div className="relative flex gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && input.trim()) {
              e.preventDefault();
              addTag(input.trim());
            }
          }}
          placeholder="Aggiungi tag..."
          className="flex-1 text-[12px] rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 outline-none focus:border-[var(--accent)] text-text font-mono"
        />
        <button
          type="button"
          onClick={() => setShowDropdown((v) => !v)}
          className="px-2 py-1 rounded-[var(--radius-sm)] border border-border bg-surface text-text-muted hover:bg-hover transition-colors"
          title="Tag predefiniti"
        >
          <Plus size={14} />
        </button>

        {showDropdown && availablePredefined.length > 0 && (
          <div className="absolute top-full mt-1 right-0 z-10 rounded-[var(--radius)] border border-border bg-surface shadow-md flex flex-col overflow-hidden min-w-[160px]">
            {availablePredefined.map((tag) => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="px-3 py-1.5 text-[12px] font-mono text-left hover:bg-hover text-text-dim"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
