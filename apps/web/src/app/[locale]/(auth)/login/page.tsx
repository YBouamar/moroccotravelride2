import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/layout/auth-card';
import { LoginForm } from '@/features/auth/components/login-form';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { getPublicEnv } from '@/lib/env';
import { getNonce } from '@/lib/security/request-context';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}

export async function generateMetadata() {
  const t = await getTranslations('auth.login');
  return { title: t('title') };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  setRequestLocale(asLocale((await params).locale));
  const { next, error } = await searchParams;
  const t = await getTranslations('auth');

  return (
    <AuthCard
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <>
          <Link href="/forgot-password" className="text-secondary underline">
            {t('login.forgot')}
          </Link>
          <p className="text-muted">
            {t('login.noAccount')}{' '}
            <Link href="/signup" className="font-semibold text-secondary underline">
              {t('login.signupLink')}
            </Link>
          </p>
        </>
      }
    >
      <LoginForm
        next={typeof next === 'string' ? next : undefined}
        notice={error === 'link' ? 'link' : undefined}
        siteKey={getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        nonce={await getNonce()}
      />
    </AuthCard>
  );
}
