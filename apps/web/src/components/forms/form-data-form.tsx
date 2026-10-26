'use client';

import { useTranslations } from 'next-intl';
import { useRef, type ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useOnboardingAction } from '@/features/onboarding/components/use-onboarding-action';
import type { FormResult } from '@/lib/action-result';

/**
 * Plain form posting its FormData to a Server Action, showing the translated error and resetting
 * on success. Fields are server-rendered children (labels, selects, inputs).
 */
export function FormDataForm({
  action,
  submitLabel,
  children,
}: {
  action: (data: FormData) => Promise<FormResult>;
  submitLabel: string;
  children: ReactNode;
}) {
  const t = useTranslations('onboarding.errors');
  const { pending, error, run } = useOnboardingAction();
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        run(
          () => action(data),
          () => form.current?.reset(),
        );
      }}
    >
      {error ? <Alert tone="danger">{t(error)}</Alert> : null}
      {children}
      <Button type="submit" disabled={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
