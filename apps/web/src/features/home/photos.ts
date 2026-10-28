import type { StaticImageData } from 'next/image';
import agadir from '@/assets/photos/city-agadir.webp';
import casablanca from '@/assets/photos/city-casablanca.webp';
import fes from '@/assets/photos/city-fes.webp';
import marrakech from '@/assets/photos/city-marrakech.webp';
import rabat from '@/assets/photos/city-rabat.webp';
import tanger from '@/assets/photos/city-tanger.webp';
import heroSahara from '@/assets/photos/hero-sahara.webp';
import heroTangier from '@/assets/photos/hero-tangier.webp';
import serviceHourly from '@/assets/photos/service-hourly.webp';
import serviceTour from '@/assets/photos/service-tour.webp';
import serviceTransfer from '@/assets/photos/service-transfer.webp';

/**
 * Photos of the public pages, hosted with the app (no third-party request, strict CSP).
 * Source: Unsplash and Pexels (free licenses, commercial use, no attribution required); credits
 * in UX.md.
 */

/** First frame of the hero video (Tangier, open-top bus): shown before and without the video. */
export const HERO_POSTER = heroTangier;

export const SERVICE_PHOTOS = {
  transfer: serviceTransfer,
  hourly: serviceHourly,
  tour: serviceTour,
} as const;

/** City photo by slug; cities without a photo use the Sahara dunes. */
const CITY_PHOTOS: Record<string, StaticImageData> = {
  agadir,
  casablanca,
  fes,
  marrakech,
  rabat,
  tanger,
};

export const cityPhoto = (slug: string) => CITY_PHOTOS[slug] ?? heroSahara;
export const hasCityPhoto = (slug: string) => slug in CITY_PHOTOS;
