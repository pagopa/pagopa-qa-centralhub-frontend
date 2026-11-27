"use client";

import { useEffect, useState } from "react";

/**
 * True once `active` has been true for `delayMs` without a break. A quick operation never
 * reaches it, so feedback for slow work does not flash on fast work.
 */
export function useSlowPending(active: boolean, delayMs = 400): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [active, delayMs]);
  return active && slow;
}
