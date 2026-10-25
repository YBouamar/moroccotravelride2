import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/logo';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';

export function SiteHeader() {
  const t = useTranslations();
  return (
    <header className="border-b border-border bg-surface">
      {/* Mobile: logo + carrier link on the first row, languages on the second. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 md:py-3">
        <Link href="/" className="rounded-control">
          <Logo height={36} alt={t('brand.logoAlt')} priority />
        </Link>
        <Link
          href="/app"
          className={buttonVariants({ variant: 'outline', className: 'md:order-last' })}
        >
          {t('nav.forCarriers')}
        </Link>
        <div className="w-full md:ms-auto md:w-auto">
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
