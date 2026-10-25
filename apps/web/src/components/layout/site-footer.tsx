import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/logo';

export function SiteFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <Logo tone="negatif" height={36} alt={t('brand.name')} />
        <div className="text-sm text-white/80">
          <p>
            © {year} {t('brand.name')}. {t('footer.rights')}
          </p>
          <p className="mt-1">{t('footer.legalPending')}</p>
        </div>
      </div>
    </footer>
  );
}
