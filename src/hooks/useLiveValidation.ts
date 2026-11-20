import { useEffect, useRef, useState } from "react";
import { useValidateSteps } from "@/hooks/useTestLifecycle";
import type { TlGherkinValidateRequest, TlLineError } from "@/types/test-lifecycle";

export const VALIDATE_DELAY_MS = 400;

/** Per-line Gherkin errors, refreshed by `schedule()` after 400 ms of inactivity. */
export function useLiveValidation(initial: TlLineError[]) {
  const validate = useValidateSteps();
  const [errors, setErrors] = useState<TlLineError[]>(initial);
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
      validate.mutate(request, { onSuccess: (result) => setErrors(result.errors) });
    }, VALIDATE_DELAY_MS);
  };

  return { errors, setErrors, schedule };
}
