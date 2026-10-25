import type { Json } from '@mtr/db';
import { rateToBps } from '@mtr/shared';

/** Fields the audit trail labels (audit.fields.* in the messages). */
export const AUDIT_FIELDS = [
  'status',
  'plan_code',
  'trial_ends_at',
  'current_period_start',
  'current_period_end',
  'marketplace_enabled',
  'marketplace_suspended_at',
  'marketplace_suspension_reason',
  'commission_rate',
  'legal_name',
  'ice',
  'role',
  'is_active',
  'verification_status',
  'rejection_reason',
] as const;
export type AuditField = (typeof AUDIT_FIELDS)[number];

export const isAuditField = (field: string): field is AuditField =>
  (AUDIT_FIELDS as readonly string[]).includes(field);

export interface AuditFormatters {
  /** Translation key for an enum value, e.g. ('subscriptionStatus', 'trial'). */
  label: (namespace: string, value: string) => string;
  yesNo: (value: boolean) => string;
  dateTime: (value: Date) => string;
  date: (value: Date) => string;
}

// The same `status` column means different things depending on the audited table.
const STATUS_NAMESPACE: Record<string, string> = {
  company: 'companyStatus',
  subscription: 'subscriptionStatus',
};

/** Human readable value of an audited field ('∅' when empty). */
export function formatAuditValue(
  entity: string,
  field: string,
  value: Json | undefined,
  f: AuditFormatters,
): string {
  if (value === null || value === undefined || value === '') return '∅';
  if (typeof value === 'boolean') return f.yesNo(value);
  if (typeof value === 'number' && field === 'commission_rate') {
    return `${(rateToBps(value) / 100).toLocaleString('fr-FR')} %`;
  }
  if (typeof value !== 'string') return JSON.stringify(value);

  switch (field) {
    case 'status':
      return STATUS_NAMESPACE[entity] ? f.label(STATUS_NAMESPACE[entity], value) : value;
    case 'plan_code':
      return f.label('plans', value);
    case 'role':
      return f.label('roles', value);
    case 'verification_status':
      return f.label('verificationStatus', value);
    case 'trial_ends_at':
    case 'marketplace_suspended_at':
      return f.dateTime(new Date(value));
    case 'current_period_start':
    case 'current_period_end':
      return f.date(new Date(value));
    default:
      return value;
  }
}
