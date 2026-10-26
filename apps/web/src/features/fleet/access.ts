import 'server-only';
import { can, parsePage, type Permission } from '@mtr/shared';
import { getCompanyContext } from '@/features/companies/context';

/** Access flags of a list page (display only: RLS remains the guard). */
export async function getListAccess(read: Permission, manage: Permission) {
  const context = await getCompanyContext();
  if (!context || !can(context.membership.role, read)) return null;
  return {
    context,
    companyId: context.membership.companyId,
    /** Can create and edit now (role + active offer, Q21). */
    canManage: can(context.membership.role, manage) && context.canWrite,
  };
}

export type ListSearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Reads the list query string (first value only for repeated keys). */
export async function readListParams(searchParams: ListSearchParams) {
  const raw = await searchParams;
  const first = (key: string) => {
    const value = raw[key];
    return (Array.isArray(value) ? value[0] : value) || undefined;
  };
  return {
    q: first('q'),
    status: first('status'),
    sort: first('sort'),
    page: parsePage(first('page')),
  };
}
