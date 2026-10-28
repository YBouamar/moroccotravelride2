'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  siteKey?: string;
  nonce?: string;
  locale: string;
  /** Receives the token, or '' when it expires. Must be stable (e.g. a state setter). */
  onToken: (token: string) => void;
}

/**
 * Cloudflare Turnstile anti-bot widget (explicit rendering). The token is verified server side
 * in every public form action. Remount it (change its key) to get a fresh single-use token.
 */
export function Turnstile({ siteKey, nonce, locale, onToken }: TurnstileProps) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && !!window.turnstile);

  useEffect(() => {
    if (!siteKey || !ready || !container.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(container.current, {
      sitekey: siteKey,
      language: locale,
      callback: onToken,
      'expired-callback': () => onToken(''),
      'error-callback': () => onToken(''),
    });
    return () => window.turnstile?.remove(widgetId);
  }, [siteKey, ready, locale, onToken]);

  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        nonce={nonce}
        onReady={() => setReady(true)}
      />
      {/* Widget height (65 px) reserved so remounting it never shifts the button. */}
      <div ref={container} className="min-h-[65px]" />
    </>
  );
}
