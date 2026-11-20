import { useEffect, useRef, useState } from "react";
import { useValidateSteps } from "@/hooks/useTestLifecycle";
import { validationErrorMessage } from "@/lib/test-lifecycle";
import type { TlGherkinValidateRequest, TlLineError } from "@/types/test-lifecycle";

export const VALIDATE_DELAY_MS = 400;
export const LIVE_VALIDATION_FAILED = "Validazione non disponibile: verrà ripetuta al salvataggio.";

/**
 * Per-line Gherkin errors, refreshed by `schedule()` after 400 ms of inactivity.
 * When the request fails the previous (now stale) errors are cleared and
 * `validationError` carries a short message (the pydantic one for a 422).
 */
export function useLiveValidation(initial: TlLineError[]) {
  const validate = useValidateSteps();
  const [errors, setErrors] = useState<TlLineError[]>(initial);
  const [validationError, setValidationError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const schedule = (request: TlGherkinValidateRequest) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      validate.mutate(request, {
        onSuccess: (result) => {
          setErrors(result.errors);
          setValidationError(null);
        },
        onError: (err) => {
          setErrors([]);
          setValidationError(validationErrorMessage(err) ?? LIVE_VALIDATION_FAILED);
        },
      });
    }, VALIDATE_DELAY_MS);
  };

  return { errors, setErrors, validationError, schedule };
}
