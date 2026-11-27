import { Loader2 } from "lucide-react";

/** Small spinner for buttons: decorative, the button label says what is happening. */
export function Spinner({ size = 14, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} aria-hidden="true" className={`animate-spin ${className}`.trim()} />;
}
