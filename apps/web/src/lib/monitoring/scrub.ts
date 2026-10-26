/**
 * Removes personal data and secrets from error reports before they leave the server or the
 * browser (security audit 2026-10-26, finding 4; law 09-08 minimisation): cookies, auth headers,
 * query strings and fragments (booking tokens), e-mail addresses, phone numbers, IP addresses.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// International or Moroccan numbers with at least 8 digits, spaces allowed.
const PHONE = /\+?\d[\d\s.-]{7,}\d/g;
const SECRET_PARAM = /([?&#](?:t|token|access_token|refresh_token|code)=)[^&#\s]+/gi;

export function scrubText(value: string): string {
  return value
    .replace(SECRET_PARAM, '$1[removed]')
    .replace(EMAIL, '[email]')
    .replace(PHONE, '[phone]');
}

function scrubUrl(url: string): string {
  // Keep only origin and path: query strings and fragments may carry tokens or search data.
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return scrubText(url.split(/[?#]/)[0] ?? '');
  }
}

interface ScrubbableEvent {
  message?: string;
  user?: Record<string, unknown>;
  request?: {
    url?: string;
    query_string?: unknown;
    cookies?: unknown;
    headers?: Record<string, string>;
    data?: unknown;
  };
  exception?: { values?: { value?: string }[] };
  breadcrumbs?: { message?: string; data?: Record<string, unknown> }[];
}

/** Sentry `beforeSend` / `beforeSendTransaction` hook: returns a cleaned copy of the event. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const copy = structuredClone(event);
  if (copy.message) copy.message = scrubText(copy.message);
  // Only an opaque id may identify the user; never e-mail, name or IP.
  if (copy.user) copy.user = typeof copy.user.id === 'string' ? { id: copy.user.id } : {};
  if (copy.request) {
    if (copy.request.url) copy.request.url = scrubUrl(copy.request.url);
    delete copy.request.query_string;
    delete copy.request.cookies;
    delete copy.request.data;
    if (copy.request.headers) {
      const allowed = ['user-agent', 'accept-language', 'content-type'];
      copy.request.headers = Object.fromEntries(
        Object.entries(copy.request.headers).filter(([key]) => allowed.includes(key.toLowerCase())),
      );
    }
  }
  for (const exception of copy.exception?.values ?? []) {
    if (exception.value) exception.value = scrubText(exception.value);
  }
  for (const breadcrumb of copy.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message);
    if (breadcrumb.data && typeof breadcrumb.data.url === 'string') {
      breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
    }
  }
  return copy;
}
