import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

/** Public pages only: private areas, booking pages and APIs are never indexed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/app',
          '/*/admin',
          '/*/booking/',
          '/*/book',
          '/*/login',
          '/*/signup',
          '/*/mfa',
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
