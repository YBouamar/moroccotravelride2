'use client';

import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import type { AdminActionResult } from '../actions';

export function ActionFeedback({ result }: { result: AdminActionResult | null }) {
  const t = useTranslations('admin');
  if (!result) return null;
  return result.ok ? (
    <Alert tone="success">{t('companies.saved')}</Alert>
  ) : (
    <Alert tone="danger">{t(`errors.${result.error}`)}</Alert>
  );
}
