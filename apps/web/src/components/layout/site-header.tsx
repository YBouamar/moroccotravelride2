import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/logo';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { SiteHeaderMenu } from './site-header-menu';

const OFFERS = [
  { key: 'transfers', href: '/search' },
  { key: 'hourly', href: '/quote?type=hourly' },
  { key: 'tours', href: '/quote?type=tour' },
] as const;

export function SiteHeader() {
  const t = useTranslations();
  return (
    <header className="border-b border-border bg-surface">
      {/* Mobile: logo + Menu button, the links fold into a panel. Desktop: one row. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 md:flex-nowrap md:py-3">
        <Link href="/" className="rounded-control">
          <Logo height={36} alt={t('brand.logoAlt')} priority />
        </Link>
        <SiteHeaderMenu label={t('nav.menu')}>
          <nav aria-label={t('nav.offers')}>
            <ul className="flex flex-col md:flex-row md:items-center md:gap-1">
              {OFFERS.map(({ key, href }) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="flex min-h-11 items-center rounded-control px-3 text-base font-medium whitespace-nowrap text-primary hover:bg-background md:inline-flex md:text-sm"
                  >
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href="/app"
            className={buttonVariants({ variant: 'outline', className: 'md:order-last' })}
          >
            {t('nav.forCarriers')}
          </Link>
          <div className="md:ms-auto">
            <LocaleSwitcher />
          </div>
        </SiteHeaderMenu>
      </div>
    </header>
  );
}
