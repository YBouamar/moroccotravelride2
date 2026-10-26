import type { Database } from '@mtr/db';
import { createClient } from '@supabase/supabase-js';
import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/seo';

// Rebuilt at most once an hour: the city list rarely changes.
export const revalidate = 3600;

const STATIC_PATHS = ['', '/legal/terms', '/legal/privacy', '/legal/notice', '/legal/cookies'];

/** Home, legal pages and one transfer page per active city, in the three languages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  let cityPaths: string[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    // Public reference data, read anonymously (no session needed for the sitemap).
    const supabase = createClient<Database>(url, key, { auth: { persistSession: false } });
    const { data } = await supabase
      .from('cities')
      .select('slug')
      .eq('is_active', true)
      .eq('is_airport', false);
    cityPaths = (data ?? []).map((city) => `/transfers/${city.slug}`);
  }

  return [...STATIC_PATHS, ...cityPaths].flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency:
        path === '' || path.startsWith('/transfers') ? ('weekly' as const) : ('yearly' as const),
      priority: path === '' ? 1 : path.startsWith('/transfers') ? 0.8 : 0.3,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((candidate) => [candidate, `${base}/${candidate}${path}`]),
        ),
      },
    })),
  );
}
