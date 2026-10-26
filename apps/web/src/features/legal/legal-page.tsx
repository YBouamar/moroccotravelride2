import { getTranslations } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';

export const LEGAL_DOCUMENTS = ['terms', 'privacy', 'notice', 'cookies'] as const;
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

/**
 * Legal page skeleton (Phase 7): factual description of what the platform does, to be completed
 * and validated by a lawyer before launch (À VALIDER, rule 13: no invented legal rule).
 */
export async function LegalPage({ document }: { document: LegalDocument }) {
  const t = await getTranslations(`legal.${document}`);
  // The section keys come from the messages (their order is the reading order).
  const raw = t.raw as unknown as (key: string) => Record<string, unknown>;
  const sections = Object.keys(raw('sections'));
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <Alert className="mt-6">{t('pending')}</Alert>
      {sections.map((key) => (
        <section key={key} className="mt-8">
          <h2 className="text-xl font-semibold">{t(`sections.${key}.title` as 'title')}</h2>
          <p className="mt-2 leading-relaxed text-foreground">
            {t(`sections.${key}.body` as 'title')}
          </p>
        </section>
      ))}
    </article>
  );
}
