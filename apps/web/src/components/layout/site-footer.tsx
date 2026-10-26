import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/logo';
import { LEGAL_DOCUMENTS } from '@/features/legal/legal-page';
import { Link } from '@/i18n/navigation';

export function SiteFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <Logo tone="negatif" height={36} alt={t('brand.name')} />
          <p className="text-sm text-white/80">{t('brand.tagline')}</p>
        </div>
        <nav aria-label={t('footer.legalTitle')}>
          <ul className="flex flex-col gap-2 text-sm">
            {LEGAL_DOCUMENTS.map((document) => (
              <li key={document}>
                <Link
                  href={`/legal/${document}`}
                  className="text-white/90 underline-offset-4 hover:underline"
                >
                  {t(`legal.${document}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-white/80">
          © {year} {t('brand.name')}. {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
