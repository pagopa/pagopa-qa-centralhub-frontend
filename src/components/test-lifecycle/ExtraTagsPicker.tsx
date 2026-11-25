import { ALLOWED_EXTRA_TAGS } from "@/lib/test-lifecycle";

/**
 * Multi-select of the category tags, rendered as toggle chips. `options` comes from the backend
 * (base tags plus those added by the migration); tags already on the scenario are always shown.
 */
export function ExtraTagsPicker({
  value,
  readOnly,
  onToggle,
  options = ALLOWED_EXTRA_TAGS,
}: {
  value: string[];
  readOnly: boolean;
  onToggle: (tag: string) => void;
  options?: readonly string[];
}) {
  const tags = [...new Set([...options, ...value])];
  return (
    <fieldset className="flex flex-col gap-1 text-xs text-text-dim">
      <legend className="mb-1">Tag aggiuntivi</legend>
      <div className="flex gap-1.5 flex-wrap">
        {tags.map((tag) => {
          const active = value.includes(tag);
          return (
            <label
              key={tag}
              data-active={active ? "true" : "false"}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[12px] cursor-pointer transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border)",
                background: active ? "var(--accent-soft)" : undefined,
                color: active ? "var(--text)" : "var(--text-dim)",
                fontWeight: active ? 500 : undefined,
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
