'use server';

import { can } from '@mtr/shared';
import { getLocale } from 'next-intl/server';
import { getCompanyContext } from '@/features/companies/context';
import { asLocale } from '@/i18n/as-locale';
import { getLiveTrips, type LiveTrip } from './queries';

/**
 * Polled every 15 s by the live map. Polling through the server keeps the session cookies
 * HttpOnly (no access token in the browser for a Realtime subscription), at the same pace as
 * the driver app sends points (BR-203).
 */
export async function refreshLiveTripsAction(): Promise<LiveTrip[]> {
  const context = await getCompanyContext();
  if (
    !context ||
    !can(context.membership.role, 'tracking.read') ||
    !context.features.has('live_tracking')
  ) {
    return [];
  }
  return getLiveTrips(context.membership.companyId, asLocale(await getLocale()));
}
