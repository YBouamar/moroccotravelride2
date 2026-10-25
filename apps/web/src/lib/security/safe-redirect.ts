import { routing } from '@/i18n/routing';

const LOCALES = routing.locales.join('|');
const SAFE_PATH = new RegExp(`^/(${LOCALES})(/[A-Za-z0-9_-]+)*/?$`);

/**
 * Only same-site, locale-prefixed paths are accepted as a post-login destination
 * (prevents open redirects such as `next=//evil.example`).
 */
export function safeNextPath(next: unknown, fallback: string): string {
  return typeof next === 'string' && SAFE_PATH.test(next) ? next : fallback;
}
