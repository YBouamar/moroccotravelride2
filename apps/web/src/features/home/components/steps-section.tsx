import { getTranslations } from 'next-intl/server';
import { RouteLine } from './route-line';

const STEPS = ['search', 'book', 'ride'] as const;

/** The three steps of a booking, joined by a road (a real sequence: numbered on purpose). */
export async function StepsSection() {
  const t = await getTranslations('home.steps');
  return (
    <section aria-labelledby="steps-title" className="mx-auto max-w-6xl px-4 py-20">
      <h2 id="steps-title" className="text-3xl font-bold tracking-tight md:text-center md:text-4xl">
        {t('title')}
      </h2>
      <ol className="relative mt-12 grid gap-0 md:grid-cols-3">
        <RouteLine />
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="relative flex gap-5 pb-10 last:pb-0 md:flex-col md:items-center md:px-6 md:pb-0 md:text-center"
          >
            {/* Mobile: a dashed segment down to the next step (the animated road is md+). */}
            {index < STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute start-6 top-12 bottom-0 -translate-x-1/2 border-s-4 border-dashed border-secondary/40 md:hidden rtl:translate-x-1/2"
              />
            ) : null}
            <span
              aria-hidden="true"
              className="relative flex size-12 shrink-0 items-center justify-center rounded-full border-4 border-background bg-secondary text-lg font-bold text-secondary-foreground"
            >
              {index + 1}
            </span>
            <span className="pt-2 md:pt-0">
              <span className="block text-lg font-semibold text-primary">{t(`${step}.title`)}</span>
              <span className="mt-1 block max-w-xs text-muted">{t(`${step}.text`)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
