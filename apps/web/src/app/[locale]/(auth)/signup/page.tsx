import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/layout/auth-card';
import { SignupForm } from '@/features/auth/components/signup-form';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';
import { getPublicEnv } from '@/lib/env';
import { getNonce } from '@/lib/security/request-context';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata() {
  const t = await getTranslations('auth.signup');
  return { title: t('title') };
}

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  // Reference data is public (RLS: cities readable by everyone). Airports are not head offices.
  const supabase = await createClient();
  const { data } = await supabase
    .from('cities')
    .select('id, name_fr, name_en, name_ar')
    .eq('is_airport', false)
    .eq('is_active', true);
  const cities = (data ?? [])
    .map((city) => ({ id: city.id, name: city[`name_${locale}`] }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <AuthCard
      title={t('signup.title')}
      subtitle={t('signup.subtitle')}
      footer={
        <p className="text-muted">
          {t('signup.hasAccount')}{' '}
          <Link href="/login" className="font-semibold text-secondary underline">
            {t('signup.loginLink')}
          </Link>
        </p>
      }
    >
      <SignupForm
        cities={cities}
        siteKey={getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        nonce={await getNonce()}
      />
    </AuthCard>
  );
}
