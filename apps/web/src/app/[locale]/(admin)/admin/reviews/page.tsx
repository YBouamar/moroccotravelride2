import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { StatusAction } from '@/components/list/status-action';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { moderateReviewAction } from '@/features/reviews/actions';
import { asLocale } from '@/i18n/as-locale';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata() {
  const t = await getTranslations('reviews');
  return { title: t('adminTitle') };
}

/** Moderation of traveler reviews (step 27): pending first. */
export default async function AdminReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale(asLocale((await params).locale));
  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const supabase = await createClient();
  const { data } = await supabase
    .from('reviews')
    .select(
      'id, rating, comment, traveler_name, status, created_at, company:companies(legal_name, trade_name), booking:bookings(public_ref)',
    )
    .order('status')
    .order('created_at', { ascending: false })
    .limit(100);
  const reviews = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('reviews.adminTitle')}</h1>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted">{t('reviews.none')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {review.company?.trade_name ?? review.company?.legal_name} ·{' '}
                    <span dir="ltr">{review.booking?.public_ref}</span>
                  </p>
                  <Badge variant={review.status === 'published' ? 'verified' : 'neutral'}>
                    {t(`reviews.status.${review.status}`)}
                  </Badge>
                </div>
                <p aria-label={t('reviews.stars', { count: review.rating })}>
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </p>
                {review.comment ? <p className="text-sm">{review.comment}</p> : null}
                <p className="text-xs text-muted">
                  {review.traveler_name} ·{' '}
                  {format.dateTime(new Date(review.created_at), { dateStyle: 'medium' })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {review.status !== 'published' ? (
                    <StatusAction
                      variant="primary"
                      label={t('reviews.publish')}
                      description={t('reviews.publishHelp')}
                      action={moderateReviewAction.bind(null, review.id, 'published')}
                    />
                  ) : null}
                  {review.status !== 'hidden' ? (
                    <StatusAction
                      label={t('reviews.hide')}
                      description={t('reviews.hideHelp')}
                      action={moderateReviewAction.bind(null, review.id, 'hidden')}
                    />
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
