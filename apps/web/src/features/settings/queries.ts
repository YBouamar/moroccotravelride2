import 'server-only';
import { parsePlatformSettings, type PlatformSettings } from '@mtr/shared';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/** Platform settings, validated (public read, RLS). Cached for the request. */
export const getPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('platform_settings').select('key, value');
  if (error) throw error;
  return parsePlatformSettings(data ?? []);
});
