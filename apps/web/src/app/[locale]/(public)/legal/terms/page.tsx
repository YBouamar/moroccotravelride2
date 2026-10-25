import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Alert } from '@/components/ui/alert';
import { asLocale } from '@/i18n/as-locale';

// Legal content to be written and validated by a lawyer before launch (À VALIDER, docs/SECURITY.md 2.6).
export default function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(asLocale(use(params).locale));
  const t = useTranslations('legal.terms');
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <Alert className="mt-6">{t('pending')}</Alert>
    </div>
  );
}
