import type { CompanyStatus, PlanCode, SubscriptionStatus } from '@mtr/shared';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

export function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
  const t = useTranslations('companyStatus');
  return <Badge variant={status === 'verified' ? 'verified' : 'neutral'}>{t(status)}</Badge>;
}

export function SubscriptionBadge({
  planCode,
  status,
}: {
  planCode: PlanCode;
  status: SubscriptionStatus;
}) {
  const t = useTranslations();
  return (
    <Badge variant={status === 'active' ? 'verified' : 'neutral'}>
      {t(`plans.${planCode}`)} · {t(`subscriptionStatus.${status}`)}
    </Badge>
  );
}
