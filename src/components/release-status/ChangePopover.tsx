import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { ACCENT_LINK_CLASS as linkClass } from "@/components/release-status/shared";
import type { ChangeItem, ChangeSummary } from "@/types/release-status";

const UNAVAILABLE_TEXT: Record<"PENDING" | "UNAVAILABLE" | "ERROR", string> = {
  PENDING: "Riepilogo in preparazione",
  UNAVAILABLE: "Riepilogo non disponibile (le versioni non corrispondono a tag GitHub)",
  ERROR: "Riepilogo non disponibile (GitHub non ha risposto)",
};

function popoverTitle(changes: ChangeSummary, from: string, to: string): string {
  if (!from) return `Modifiche a ${to}`;
  switch (changes.direction) {
    case "rollback":
      return `Rollback da ${from} a ${to} — modifiche rimosse`;
    case "diverged":
      return `Modifiche da ${from} a ${to} — le versioni non sono in sequenza`;
    case "identical":
      return `Nessuna modifica tra ${from} e ${to}`;
    default:
      return `Modifiche da ${from} a ${to}`;
  }
}

function ItemLink({ item }: { item: ChangeItem }) {
  return (
    <li className="text-xs">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} break-words`}>
        {item.kind === "pr" && item.number !== null ? `#${item.number} ` : ""}
        {item.title}
      </a>
      {item.author && <span className="text-text-muted"> · {item.author}</span>}
    </li>
  );
}

function ChangeBody({ changes, from, to }: { changes: ChangeSummary; from: string; to: string }) {
  if (changes.status !== "OK") {
    return (
      <>
        <PopoverTitle className="sr-only">{popoverTitle(changes, from, to)}</PopoverTitle>
        <p className="text-xs text-text-muted">{UNAVAILABLE_TEXT[changes.status]}</p>
      </>
    );
  }
  const prs = changes.items.filter((item) => item.kind === "pr");
  const commits = changes.items.filter((item) => item.kind === "commit");
  return (
    <>
      <PopoverTitle className="text-sm font-semibold text-text">{popoverTitle(changes, from, to)}</PopoverTitle>
      {prs.length > 0 && (
        <ul aria-label="Pull request" className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
          {prs.map((item) => (
            <ItemLink key={item.url} item={item} />
          ))}
        </ul>
      )}
      {commits.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-text-muted">Altri commit ({commits.length})</summary>
          <ul aria-label="Altri commit" className="mt-1.5 flex max-h-60 flex-col gap-1.5 overflow-y-auto">
            {commits.map((item) => (
              <ItemLink key={item.url} item={item} />
            ))}
          </ul>
        </details>
      )}
      <p className="flex flex-wrap items-center gap-x-1 text-xs text-text-muted">
        <span>{changes.total_commits} commit</span>
        {changes.compare_url && (
          <>
            <span aria-hidden="true">·</span>
            <a href={changes.compare_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Confronto su GitHub
            </a>
          </>
        )}
        {changes.truncated && (
          <>
            <span aria-hidden="true">·</span>
            <span>elenco parziale</span>
          </>
        )}
      </p>
    </>
  );
}

interface ChangePopoverProps {
  fromVersion: string;
  toVersion: string;
  /** `null` for a baseline: there is nothing to compare, so no trigger is rendered. */
  changes: ChangeSummary | null;
  /** The version text; it becomes the (focusable) trigger. */
  children: ReactNode;
  /** Called when the trigger is hovered, focused or clicked (e.g. to start loading the summary). */
  onArm?: () => void;
  /** Keeps the (focusable) trigger in place but never opens: no summary applies to this version. */
  inert?: boolean;
}

/** Popover listing what changed between two deployed versions. */
export function ChangePopover({ fromVersion, toVersion, changes, children, onArm, inert = false }: ChangePopoverProps) {
  if (!changes && !inert) return <>{children}</>;
  return (
    <Popover open={inert ? false : undefined}>
      <PopoverTrigger
        openOnHover
        delay={200}
        onClick={(event) => {
          event.stopPropagation();
          onArm?.();
        }}
        onFocus={onArm}
        onPointerEnter={onArm}
        aria-disabled={inert || undefined}
        className={`inline-flex min-w-0 max-w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          inert
            ? "cursor-default"
            : "cursor-pointer underline decoration-dotted decoration-text-dim underline-offset-2 hover:decoration-accent"
        }`}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] gap-2 bg-surface text-text"
        onClick={(event) => event.stopPropagation()}
      >
        {changes && <ChangeBody changes={changes} from={fromVersion} to={toVersion} />}
      </PopoverContent>
    </Popover>
  );
}
