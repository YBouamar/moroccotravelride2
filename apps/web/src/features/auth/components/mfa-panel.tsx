'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { enrollTotpAction, verifyTotpAction } from '../actions';
import { useAuthForm } from './use-auth-form';

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/** TOTP enrollment (first time) or challenge (existing factor) for admin access (aal2). */
export function MfaPanel({ factorId }: { factorId?: string }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { error, pending, submit } = useAuthForm();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const activeFactor = factorId ?? enrollment?.factorId;

  const startEnrollment = () =>
    submit(async () => {
      const result = await enrollTotpAction();
      if (!result.ok) return result;
      setEnrollment(result);
      return { ok: true };
    });

  const verify = (event: FormEvent) => {
    event.preventDefault();
    if (!activeFactor) return;
    submit(() => verifyTotpAction({ factorId: activeFactor, code: code.trim() }, { locale }));
  };

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert tone="danger">{t(`errors.${error}`)}</Alert> : null}
      {!activeFactor ? (
        <>
          <p className="text-sm text-muted">{t('mfa.enrollIntro')}</p>
          <Button size="lg" onClick={startEnrollment} disabled={pending}>
            {t('mfa.enrollStart')}
          </Button>
        </>
      ) : (
        <form onSubmit={verify} noValidate className="flex flex-col gap-4">
          {enrollment ? (
            <>
              <p className="text-sm">{t('mfa.scan')}</p>
              {/* QR code returned by Supabase as an SVG data URL */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollment.qrCode}
                alt={t('mfa.qrAlt')}
                width={192}
                height={192}
                className="mx-auto rounded-control border border-border bg-white p-2"
              />
              <p className="text-sm text-muted">
                {t('mfa.secret')}{' '}
                <code dir="ltr" className="break-all font-mono text-foreground">
                  {enrollment.secret}
                </code>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">{t('mfa.challengeIntro')}</p>
          )}
          <FormField id="code" label={t('fields.code')}>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              dir="ltr"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </FormField>
          <Button type="submit" size="lg" disabled={pending || code.trim().length !== 6}>
            {t('mfa.submit')}
          </Button>
        </form>
      )}
    </div>
  );
}
