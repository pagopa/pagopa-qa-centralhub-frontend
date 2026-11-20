import { ALLOWED_EXTRA_TAGS } from "@/lib/test-lifecycle";

/** Multi-select of the controlled extra tags (ALLOWED_EXTRA_TAGS), rendered as toggle chips. */
export function ExtraTagsPicker({
  value,
  readOnly,
  onToggle,
}: {
  value: string[];
  readOnly: boolean;
  onToggle: (tag: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1 text-xs text-text-dim">
      <legend className="mb-1">Tag aggiuntivi</legend>
      <div className="flex gap-1.5 flex-wrap">
        {ALLOWED_EXTRA_TAGS.map((tag) => {
          const active = value.includes(tag);
          return (
            <label
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[12px] cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border)",
                color: active ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={active}
                disabled={readOnly}
                onChange={() => onToggle(tag)}
              />
              @{tag}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
