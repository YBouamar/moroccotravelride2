import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/layout/auth-card';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { getPublicEnv } from '@/lib/env';
import { getNonce } from '@/lib/security/request-context';

export async function generateMetadata() {
  const t = await getTranslations('auth.forgot');
  return { title: t('title') };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale(asLocale((await params).locale));
  const t = await getTranslations('auth.forgot');

  return (
    <AuthCard
      title={t('title')}
      subtitle={t('subtitle')}
      footer={
        <Link href="/login" className="text-secondary underline">
          {t('backToLogin')}
        </Link>
      }
    >
      <ForgotPasswordForm
        siteKey={getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        nonce={await getNonce()}
      />
    </AuthCard>
  );
}
