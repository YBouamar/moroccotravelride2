import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Link } from '@/i18n/navigation';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t('auth.back')}
        </Link>
        <LocaleSwitcher />
      </header>
      <main id="main" className="flex flex-1 justify-center px-4 pt-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Logo layout="vertical" height={96} alt={t('brand.name')} priority />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
