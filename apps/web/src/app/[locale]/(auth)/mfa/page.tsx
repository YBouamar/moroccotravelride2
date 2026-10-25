import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/layout/auth-card';
import { MfaPanel } from '@/features/auth/components/mfa-panel';
import { asLocale } from '@/i18n/as-locale';
import { createClient } from '@/lib/supabase/server';

/** Second factor for platform admins: enrollment the first time, then a code at each sign-in. */
export default async function MfaPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('auth.mfa');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_platform_admin) redirect(`/${locale}/app`);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal2') redirect(`/${locale}/admin`);

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp.find((factor) => factor.status === 'verified');

  return (
    <AuthCard title={t('title')}>
      <MfaPanel factorId={verified?.id} />
    </AuthCard>
  );
}
