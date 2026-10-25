'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState, useTransition } from 'react';
import type { ActionResult, AuthError } from '../actions';

/** Shared state of the auth forms: server error, pending transition, single-use captcha token. */
export function useAuthForm() {
  const tValidation = useTranslations('validation');
  const [error, setError] = useState<AuthError | null>(null);
  const [captcha, setCaptcha] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const [pending, startTransition] = useTransition();

  /** Translates a Zod issue code (packages/shared/src/auth-schemas.ts) into a message. */
  const fieldError = useCallback(
    (code?: string) => (code ? tValidation(code as Parameters<typeof tValidation>[0]) : undefined),
    [tValidation],
  );

  const submit = useCallback((action: () => Promise<ActionResult>, onSuccess?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        onSuccess?.();
        return;
      }
      setError(result.error);
      // Turnstile tokens are single use: remount the widget for a fresh one.
      setCaptcha('');
      setCaptchaKey((key) => key + 1);
    });
  }, []);

  return { error, captcha, setCaptcha, captchaKey, pending, submit, fieldError };
}
