'use client';

import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { uploadDocumentAction } from '../actions';
import { useOnboardingAction } from './use-onboarding-action';

/** Uploads one document; the server checks the real file type and size again. */
export function DocumentUploadForm({ licenseMissing }: { licenseMissing: boolean }) {
  const t = useTranslations();
  const formRef = useRef<HTMLFormElement>(null);
  const [localError, setLocalError] = useState<'fileMissing' | 'fileSize' | null>(null);
  const { pending, error, run } = useOnboardingAction();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get('file');
    // Quick feedback before sending; the Server Action validates everything again.
    if (!(file instanceof File) || file.size === 0) return setLocalError('fileMissing');
    if (file.size > MAX_DOCUMENT_BYTES) return setLocalError('fileSize');
    setLocalError(null);
    run(
      () => uploadDocumentAction(data),
      () => formRef.current?.reset(),
    );
  };

  const shownError = localError ?? error;
  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4">
      {licenseMissing ? <Alert>{t('documentsForm.licenseRequired')}</Alert> : null}
      {shownError ? <Alert tone="danger">{t(`onboarding.errors.${shownError}`)}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="type" label={t('documentsForm.type')}>
          <Select name="type" defaultValue={licenseMissing ? 'tourism_license' : 'insurance'}>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`documentType.${type}`)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="expiresOn" label={t('documentsForm.expiresOn')}>
          <Input type="date" name="expiresOn" />
        </FormField>
      </div>
      <FormField id="file" label={t('documentsForm.file')} hint={t('documentsForm.fileHint')}>
        <Input
          type="file"
          name="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="py-2 file:me-3 file:rounded-control file:border-0 file:bg-background file:px-3 file:py-1"
        />
      </FormField>
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {t('documentsForm.upload')}
      </Button>
    </form>
  );
}
