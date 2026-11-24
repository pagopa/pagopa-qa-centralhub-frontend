"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useStoredFlag } from "@/lib/stored-flag";
import type { AreaTone } from "./nav-config";
import { areaStyle } from "./NavItemLink";

interface NavSectionProps {
  id: string;
  label: string;
  tone: AreaTone;
  defaultClosed?: boolean;
  /** Number of visible entries, shown next to the title while the section is closed. */
  count: number;
  /** The current page belongs to this section: it opens itself when it becomes active. */
  hasActive: boolean;
  /** Keep the section open regardless of the stored state (used while filtering). */
  forceOpen: boolean;
  /** Icon-only mode: no title, no collapsing, a thin divider instead. */
  rail: boolean;
  children: ReactNode;
}

export function NavSection({ id, label, tone, defaultClosed = false, count, hasActive, forceOpen, rail, children }: NavSectionProps) {
  const [storedOpen, setOpen] = useStoredFlag(`qa-hub-nav-open-${id}`, !defaultClosed);
  const itemsId = useId();

  // Opening because the current page is inside the section is temporary: it is not saved, so the
  // stored preference (and "Admin closed by default") is untouched. It re-arms each time the page enters the section.
  const [seenActive, setSeenActive] = useState(hasActive);
  const [autoOpened, setAutoOpened] = useState(hasActive);
  if (hasActive !== seenActive) {
    setSeenActive(hasActive);
    setAutoOpened(hasActive);
  }

  const open = storedOpen || autoOpened || forceOpen;

  if (rail) {
    return (
      <div className="px-2 py-1" style={areaStyle(tone)}>
        <div className="mx-2 my-[6px] border-t border-border" aria-hidden="true" />
        {children}
      </div>
    );
  }

  return (
    <div className="px-2 py-1" style={areaStyle(tone)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={itemsId}
        onClick={() => {
          if (forceOpen) return;
          const opened = storedOpen || autoOpened;
          setAutoOpened(false);
          setOpen(!opened);
        }}
        className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-[10px] pt-2 pb-[6px] text-left text-[12px] font-semibold uppercase tracking-[0.06em] text-text transition-colors hover:bg-hover"
      >
        <span className="size-[9px] shrink-0 rounded-[2px] bg-[color:var(--area)]" aria-hidden="true" />
        {label}
        {!open && (
          <>
            <span data-testid="nav-section-count" aria-hidden="true" className="ml-auto text-[12px] font-medium normal-case tracking-normal text-text-dim">
              {count}
            </span>
            <span className="sr-only">{`(${count} voci)`}</span>
          </>
        )}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`shrink-0 text-text-dim transition-transform ${open ? "" : "-rotate-90"} ${open ? "ml-auto" : ""}`}
        />
      </button>
      <div id={itemsId} hidden={!open}>
        {open && children}
      </div>
    </div>
  );
}
