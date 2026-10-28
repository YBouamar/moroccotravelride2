import type { StaticImageData } from 'next/image';
import agadir from '@/assets/photos/city-agadir.webp';
import casablanca from '@/assets/photos/city-casablanca.webp';
import fes from '@/assets/photos/city-fes.webp';
import marrakech from '@/assets/photos/city-marrakech.webp';
import rabat from '@/assets/photos/city-rabat.webp';
import tanger from '@/assets/photos/city-tanger.webp';
import heroSahara from '@/assets/photos/hero-sahara.webp';
import serviceHourly from '@/assets/photos/service-hourly.webp';
import serviceTour from '@/assets/photos/service-tour.webp';
import serviceTransfer from '@/assets/photos/service-transfer.webp';

/**
 * Photos of the public pages, hosted with the app (no third-party request, strict CSP).
 * Source: Unsplash (free license, commercial use, no attribution required); credits in UX.md.
 */

export const HERO_PHOTO = heroSahara;

export const SERVICE_PHOTOS = {
  transfer: serviceTransfer,
  hourly: serviceHourly,
  tour: serviceTour,
} as const;

/** City photo by slug; cities without a photo use the hero photo. */
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
