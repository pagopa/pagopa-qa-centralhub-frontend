"use client";

import { Bot, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGenerateTlSynopsis } from "@/hooks/useTestLifecycle";
import { writeErrorMessage } from "@/lib/test-lifecycle";

const OVERWRITE_CONFIRM = "La descrizione contiene già del testo: sostituirla con la sinossi generata?";

/**
 * Small robot button next to the "Descrizione" label: asks the backend (Gemini) for a synopsis of
 * the feature file shown in "Anteprima file" and hands it to `onGenerated`. Nothing is saved here:
 * the caller puts the text in the field and saves it through the normal draft flow.
 */
export function GenerateSynopsisButton({
  featureId,
  revisionId,
  hasText,
  onGenerated,
  onError,
}: {
  featureId: string;
  revisionId: string;
  hasText: boolean;
  onGenerated: (synopsis: string) => void;
  onError: (message: string | null) => void;
}) {
  const generate = useGenerateTlSynopsis();

  const run = () => {
    if (hasText && !window.confirm(OVERWRITE_CONFIRM)) return;
    onError(null);
    generate.mutate(
      { featureId, revisionId },
      {
        onSuccess: (out) => onGenerated(out.synopsis),
        onError: (err) => onError(writeErrorMessage(err)),
      },
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="Genera con AI"
              disabled={generate.isPending}
              onClick={run}
              className="inline-flex size-5 items-center justify-center rounded-[var(--radius-sm)] text-text-dim normal-case outline-none hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-60"
            >
              {generate.isPending ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Bot size={14} aria-hidden />
              )}
            </button>
          }
        />
        <TooltipContent>Genera con AI</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
