import 'server-only';
import { can } from '@mtr/shared';
import { getCompanyContext } from '@/features/companies/context';

/** Company context when the signed-in user may set up the company (owner or manager). */
export async function getOfficeContext() {
  const context = await getCompanyContext();
  return context && can(context.membership.role, 'company.update') ? context : null;
}
