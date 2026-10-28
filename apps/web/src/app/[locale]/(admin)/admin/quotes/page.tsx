import type { QuoteStatus } from '@mtr/shared';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { StatusAction } from '@/components/list/status-action';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { setQuoteStatusAction } from '@/features/quotes/actions';
import { asLocale } from '@/i18n/as-locale';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata() {
  const t = await getTranslations('quote.admin');
  return { title: t('title') };
}

const NEXT_STATUSES: Record<QuoteStatus, QuoteStatus[]> = {
  new: ['handled', 'closed'],
  handled: ['closed'],
  closed: ['new'],
};

/** Quote requests (ADR-040): new ones first; the admin answers by e-mail or phone. */
export default async function AdminQuotesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  setRequestLocale(locale);
  const [t, format] = await Promise.all([getTranslations('quote'), getFormatter()]);
  const supabase = await createClient();
  const { data } = await supabase
    .from('quote_requests')
    .select(
      'id, kind, name, email, phone, start_date, days, passengers, message, status, created_at, city:cities(name_fr, name_en, name_ar)',
    )
    .order('status')
    .order('created_at', { ascending: false })
    .limit(200);
  const requests = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
      {requests.length === 0 ? (
        <p className="text-sm text-muted">{t('admin.none')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <li key={request.id}>
              <Card className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {t(`kinds.${request.kind as 'tour'}.title`)} · {request.name}
                  </p>
                  <Badge variant={request.status === 'new' ? 'verified' : 'neutral'}>
                    {t(`admin.status.${request.status as QuoteStatus}`)}
                  </Badge>
                </div>
                <p className="text-sm">
                  {t('admin.summary', {
                    city: request.city?.[`name_${locale}`] ?? '',
                    date: format.dateTime(new Date(`${request.start_date}T12:00:00Z`), {
                      dateStyle: 'medium',
                      timeZone: 'Africa/Casablanca',
                    }),
                    days: request.days,
                    passengers: request.passengers,
                  })}
                </p>
                <p className="text-sm">
                  <a href={`mailto:${request.email}`} dir="ltr" className="underline">
                    {request.email}
                  </a>{' '}
                  ·{' '}
                  <a
                    href={`tel:${request.phone.replace(/ /g, '')}`}
                    dir="ltr"
                    className="underline"
                  >
                    {request.phone}
                  </a>
                </p>
                {request.message ? (
                  <p className="text-sm whitespace-pre-line text-muted">{request.message}</p>
                ) : null}
                <p className="text-xs text-muted">
                  {format.dateTime(new Date(request.created_at), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUSES[request.status as QuoteStatus].map((status) => (
                    <StatusAction
                      key={status}
                      variant={status === 'handled' ? 'primary' : 'outline'}
                      label={t(`admin.to.${status}`)}
                      description={t(`admin.toHelp.${status}`)}
                      action={setQuoteStatusAction.bind(null, request.id, status)}
                    />
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
