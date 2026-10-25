import type { PaymentInfo } from '@mtr/shared';
import { getTranslations } from 'next-intl/server';
import { Card, CardTitle } from '@/components/ui/card';

/** RIB shown in groups of 4 digits for readability (always left-to-right). */
const groupRib = (rib: string) => rib.replace(/(\d{4})(?=\d)/g, '$1 ');

/** Platform payment details for subscriptions (Q23), filled in by the admin in Settings. */
export async function PaymentDetails({ info }: { info: PaymentInfo }) {
  const t = await getTranslations('subscription');
  const rows = [
    { key: 'bank', label: t('bank'), value: info.bank_name },
    { key: 'holder', label: t('holder'), value: info.account_holder },
    { key: 'rib', label: t('rib'), value: info.rib && groupRib(info.rib), ltr: true },
    {
      key: 'email',
      label: t('email'),
      value: info.email,
      href: info.email ? `mailto:${info.email}` : undefined,
      ltr: true,
    },
    {
      key: 'phone',
      label: t('phone'),
      value: info.phone,
      href: info.phone ? `tel:${info.phone.replace(/\s/g, '')}` : undefined,
      ltr: true,
    },
  ].filter((row) => row.value);

  // Nothing filled in yet by the admin: the generic instructions above are enough.
  if (rows.length === 0) return null;

  return (
    <Card>
      <CardTitle>{t('paymentTitle')}</CardTitle>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.key}>
            <dt className="text-sm text-muted">{row.label}</dt>
            {/* LTR on the value only, so it stays aligned with its label in Arabic. */}
            <dd className="mt-1 font-medium">
              {row.href ? (
                <a href={row.href} dir="ltr" className="text-secondary underline">
                  {row.value}
                </a>
              ) : (
                <span
                  dir={row.ltr ? 'ltr' : undefined}
                  className={row.key === 'rib' ? 'font-mono' : undefined}
                >
                  {row.value}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
