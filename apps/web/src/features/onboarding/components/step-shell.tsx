import { ONBOARDING_STEPS, type OnboardingStep } from '@mtr/shared';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

/** Common frame of an onboarding step: progress, title, explanation, back link. */
export async function StepShell({ step, children }: { step: OnboardingStep; children: ReactNode }) {
  const t = await getTranslations('onboarding');
  const index = ONBOARDING_STEPS.indexOf(step);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/app/onboarding"
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-secondary"
      >
        <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
        {t('back')}
      </Link>
      <div>
        <p className="text-sm font-medium text-secondary">
          {t('stepOf', { current: index + 1, total: ONBOARDING_STEPS.length })}
        </p>
        <div
          className="mt-2 flex gap-1"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={ONBOARDING_STEPS.length}
          aria-valuenow={index + 1}
          aria-label={t('stepOf', { current: index + 1, total: ONBOARDING_STEPS.length })}
        >
          {ONBOARDING_STEPS.map((key, position) => (
            <span
              key={key}
              className={`h-1.5 flex-1 rounded-full ${position <= index ? 'bg-secondary' : 'bg-border'}`}
            />
          ))}
        </div>
        <h1 className="mt-4 text-2xl font-bold">{t(`steps.${step}.title`)}</h1>
        <p className="mt-1 text-muted">{t(`steps.${step}.text`)}</p>
      </div>
      <Card>{children}</Card>
    </div>
  );
}
