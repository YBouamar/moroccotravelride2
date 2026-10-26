import { describe, expect, it } from 'vitest';
import { scrubEvent, scrubText } from './scrub';

describe('error report scrubbing', () => {
  it('removes e-mails, phone numbers and tokens from messages', () => {
    expect(scrubText('send to emma@example.test failed')).toBe('send to [email] failed');
    expect(scrubText('call +212 661 00 00 13 now')).toBe('call [phone] now');
    expect(scrubText('/fr/booking/MTR-K7P2QX#t=1893456000.abc')).toBe(
      '/fr/booking/MTR-K7P2QX#t=[removed]',
    );
  });

  it('keeps only safe request data and an opaque user id', () => {
    const event = scrubEvent({
      message: 'boom for emma@example.test',
      user: { id: 'u1', email: 'emma@example.test', ip_address: '1.2.3.4' },
      request: {
        url: 'https://moroccotravelride.ma/fr/search?from=a&to=b',
        query_string: 'from=a&to=b',
        cookies: { 'sb-access-token': 'secret' },
        headers: { Cookie: 'x', Authorization: 'Bearer y', 'User-Agent': 'Mozilla' },
        data: { password: 'x' },
      },
      breadcrumbs: [{ message: 'fetch', data: { url: 'https://x.test/a?token=abc' } }],
    });
    expect(event.message).toBe('boom for [email]');
    expect(event.user).toEqual({ id: 'u1' });
    expect(event.request).toEqual({
      url: 'https://moroccotravelride.ma/fr/search',
      headers: { 'User-Agent': 'Mozilla' },
    });
    expect(event.breadcrumbs?.[0]?.data?.url).toBe('https://x.test/a');
  });
});
