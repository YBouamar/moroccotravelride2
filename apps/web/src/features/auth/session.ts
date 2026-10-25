import 'server-only';
import type { Locale } from 'next-intl';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Signed-in user for Server Components and layouts (validated with the Auth server, not just
 * decoded from the cookie). Cached for the duration of a request.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_platform_admin')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name || user.email || '',
    isPlatformAdmin: profile?.is_platform_admin ?? false,
  };
});

export async function requireUser(locale: Locale) {
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}
