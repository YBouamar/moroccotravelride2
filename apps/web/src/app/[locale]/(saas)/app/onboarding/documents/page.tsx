import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { DeleteDocumentButton } from '@/features/onboarding/components/delete-document-button';
import { DocumentUploadForm } from '@/features/onboarding/components/document-upload-form';
import { StepShell } from '@/features/onboarding/components/step-shell';
import { getOfficeContext } from '@/features/onboarding/office';
import { getOnboardingData } from '@/features/onboarding/queries';
import { asLocale } from '@/i18n/as-locale';
import { Link } from '@/i18n/navigation';

export default async function DocumentsStepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale(asLocale((await params).locale));
  const [t, format, context] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getOfficeContext(),
  ]);
  if (!context) return <Alert>{t('onboarding.officeOnly')}</Alert>;

  const { documents, progress } = await getOnboardingData(context.membership.companyId);
  const licenseDone = progress.steps.find((step) => step.key === 'documents')?.done ?? false;
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: 'medium' });

  return (
    <StepShell step="documents">
      <DocumentUploadForm licenseMissing={!licenseDone} />

      <h2 className="mt-8 font-semibold">{t('documentsForm.uploaded')}</h2>
      {documents.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t('documentsForm.none')}</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t(`documentType.${document.type}`)}</p>
                <p className="text-sm text-muted">
                  {t('documentsForm.uploadedOn', { date: date(document.created_at) })}
                  {document.expires_on
                    ? ` · ${t('documentsForm.expires', { date: date(document.expires_on) })}`
                    : null}
                </p>
                {document.verification_status === 'rejected' && document.rejection_reason ? (
                  <p className="text-sm text-danger">
                    {t('documentsForm.rejected', { reason: document.rejection_reason })}
                  </p>
                ) : null}
              </div>
              <Badge variant={document.verification_status === 'approved' ? 'verified' : 'neutral'}>
                {t(`verificationStatus.${document.verification_status}`)}
              </Badge>
              {document.verification_status === 'pending' ? (
                <DeleteDocumentButton documentId={document.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {licenseDone ? (
        <Link
          href="/app/onboarding/vehicle"
          className={buttonVariants({ size: 'lg', className: 'mt-6' })}
        >
          {t('onboarding.save')}
        </Link>
      ) : null}
    </StepShell>
  );
}
