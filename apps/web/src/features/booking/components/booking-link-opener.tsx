'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { useRouter } from '@/i18n/navigation';
import { openBookingLinkAction } from '../actions';

/**
 * Reads the token of an e-mail link from the URL fragment (#t=...), which browsers never send to
 * the server, exchanges it for the HttpOnly access cookie, then removes it from the address bar
 * and the history (security audit 2026-10-26, finding 5).
 */
export function BookingLinkOpener({ bookingRef }: { bookingRef: string }) {
  const t = useTranslations('booking');
  const router = useRouter();
  const [state, setState] = useState<'opening' | 'invalid'>('opening');
  // The fragment is read once (React runs effects twice in development).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('t');
    window.history.replaceState(null, '', window.location.pathname);
    const opening = token
      ? openBookingLinkAction(bookingRef, token)
      : Promise.resolve({ ok: false });
    void opening.then((result) => {
      if (result.ok) router.refresh();
      else setState('invalid');
    });
  }, [bookingRef, router]);

  return state === 'invalid' ? (
    <Alert tone="danger">{t('errors.link')}</Alert>
  ) : (
    <p className="text-sm text-muted" role="status">
      {t('opening')}
    </p>
  );
}
