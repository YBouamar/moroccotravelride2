import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/logo';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations();
  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
    >
      <Logo layout="vertical" height={140} alt={t('brand.name')} />
      <h1 className="mt-8 text-3xl font-bold">{t('notFound.title')}</h1>
      <p className="mt-3 text-muted">{t('notFound.text')}</p>
      <Link href="/" className={buttonVariants({ className: 'mt-8' })}>
        {t('notFound.back')}
      </Link>
    </main>
  );
}
