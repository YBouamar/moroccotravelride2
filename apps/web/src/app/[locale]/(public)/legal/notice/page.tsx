import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/features/legal/legal-page';
import { asLocale } from '@/i18n/as-locale';
import { localeAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale: asLocale(locale), namespace: 'legal.notice' });
  return { title: t('title'), alternates: localeAlternates(locale, '/legal/notice') };
}

// Content to be completed and validated by a lawyer before launch (À VALIDER, SECURITY.md 2.6).
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale((await params).locale));
  return <LegalPage document="notice" />;
}
