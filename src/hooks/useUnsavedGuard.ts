import { useEffect, useRef } from "react";

/** Asks the browser to confirm leaving the page while `hasUnsaved()` is true (checked at event time). */
export function useUnsavedGuard(hasUnsaved: () => boolean): void {
  const latest = useRef(hasUnsaved);
  useEffect(() => {
    latest.current = hasUnsaved;
  });
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!latest.current()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);
}
