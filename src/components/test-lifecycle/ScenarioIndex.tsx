export interface ScenarioIndexItem {
  id: string;
  number: number;
  title: string;
  errors: number;
}

/** Side index of the scenarios: jump to a card. Hidden below `lg` by the caller. */
export function ScenarioIndex({
  items,
  onSelect,
}: {
  items: ScenarioIndexItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Indice scenari" className="flex flex-col gap-1">
      <span className="font-mono text-[11px] uppercase text-text-muted mb-1">Scenari</span>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-left text-[13px] text-text-dim hover:bg-subtle hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => onSelect(item.id)}
        >
          <span className="font-mono text-[12px] text-text-muted">#{item.number}</span>
          <span className="truncate min-w-0 flex-1">{item.title}</span>
          {item.errors > 0 && (
            <span
              className="font-mono text-[11px] rounded-full px-1.5"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {item.errors}
              <span className="sr-only"> errori</span>
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
