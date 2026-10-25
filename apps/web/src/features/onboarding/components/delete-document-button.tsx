'use client';

import { useTranslations } from 'next-intl';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { deleteDocumentAction } from '../actions';
import { useOnboardingAction } from './use-onboarding-action';

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const t = useTranslations('documentsForm');
  const { pending, run } = useOnboardingAction();
  return (
    <ConfirmButton
      label={t('delete')}
      description={t('deleteConfirm')}
      variant="outline"
      disabled={pending}
      onConfirm={() => run(() => deleteDocumentAction(documentId))}
    />
  );
}
