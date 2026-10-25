'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { OnboardingError, OnboardingResult } from '../actions';

/** Runs an onboarding Server Action, shows its error, and moves on to `nextHref` on success. */
export function useOnboardingAction(nextHref?: string) {
  const router = useRouter();
  const tValidation = useTranslations('validation');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<OnboardingError | null>(null);

  const run = useCallback(
    (action: () => Promise<OnboardingResult>, onSuccess?: () => void) => {
      setError(null);
      startTransition(async () => {
        const result = await action();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onSuccess?.();
        if (nextHref) router.push(nextHref);
        else router.refresh();
      });
    },
    [nextHref, router],
  );

  /** Translates a Zod issue code into a message. */
  const fieldError = useCallback(
    (code?: string) => (code ? tValidation(code as Parameters<typeof tValidation>[0]) : undefined),
    [tValidation],
  );

  return { pending, error, run, fieldError };
}
