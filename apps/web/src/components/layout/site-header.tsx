import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/logo';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';

const OFFERS = [
  { key: 'transfers', href: '/search' },
  { key: 'hourly', href: '/quote?type=hourly' },
  { key: 'tours', href: '/quote?type=tour' },
] as const;

export function SiteHeader() {
  const t = useTranslations();
  return (
    <header className="border-b border-border bg-surface">
      {/* Mobile: logo + carrier link, then offers, then languages. Desktop: one row. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 md:flex-nowrap md:py-3">
        <Link href="/" className="rounded-control">
          <Logo height={36} alt={t('brand.logoAlt')} priority />
        </Link>
        <Link
          href="/app"
          className={buttonVariants({ variant: 'outline', className: 'md:order-last' })}
        >
          {t('nav.forCarriers')}
        </Link>
        <nav aria-label={t('nav.offers')} className="w-full overflow-x-auto md:ms-6 md:w-auto">
          <ul className="flex items-center gap-1">
            {OFFERS.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium whitespace-nowrap text-primary hover:bg-background"
                >
                  {t(`nav.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="w-full md:ms-auto md:w-auto">
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
