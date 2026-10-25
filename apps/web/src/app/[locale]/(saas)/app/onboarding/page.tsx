import { CheckCircle2, Circle } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getOfficeContext } from '@/features/onboarding/office';
import { getOnboardingData } from '@/features/onboarding/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export async function generateMetadata() {
  const t = await getTranslations('onboarding');
  return { title: t('title') };
}

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  const [t, context] = await Promise.all([getTranslations('onboarding'), getOfficeContext()]);
  if (!context) return <Alert>{t('officeOnly')}</Alert>;

  const { progress } = await getOnboardingData(context.membership.companyId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted">{t('intro')}</p>
        <p className="mt-3 text-sm font-medium text-secondary">
          {t('progress', { done: progress.doneCount, total: progress.steps.length })}
        </p>
      </div>

      {progress.completed ? (
        <Alert tone="success" title={t('completedTitle')}>
          {t('completedText')}
        </Alert>
      ) : null}

      <ol className="flex flex-col gap-3">
        {progress.steps.map(({ key, done }, index) => (
          <li key={key}>
            <Card className="flex flex-wrap items-center gap-4">
              {done ? (
                <CheckCircle2 aria-hidden="true" className="size-6 shrink-0 text-success" />
              ) : (
                <Circle aria-hidden="true" className="size-6 shrink-0 text-muted" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">
                  {index + 1}. {t(`steps.${key}.title`)}
                </h2>
                <p className="text-sm text-muted">{t(`steps.${key}.text`)}</p>
              </div>
              <Badge variant={done ? 'verified' : 'neutral'}>{done ? t('done') : t('todo')}</Badge>
              <Link
                href={`/app/onboarding/${key}`}
                className={buttonVariants({
                  variant: key === progress.nextStep ? 'primary' : 'outline',
                })}
              >
                {done ? t('edit') : t('start')}
              </Link>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
