import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/layout/auth-card';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { asLocale } from '@/i18n/as-locale';

// Reached from the recovery e-mail: /api/auth/confirm has opened the session (proxy requires it).
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale(asLocale((await params).locale));
  const t = await getTranslations('auth');
  return (
    <AuthCard title={t('reset.title')}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
