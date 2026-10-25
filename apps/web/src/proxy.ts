import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Locale negotiation and prefixing (/fr, /en, /ar). Auth checks join here in step 5.
export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
