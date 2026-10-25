import { describe, expect, it } from 'vitest';
import { formatAuditValue, type AuditFormatters } from './audit-format';

const f: AuditFormatters = {
  label: (namespace, value) => `${namespace}.${value}`,
  yesNo: (value) => (value ? 'yes' : 'no'),
  dateTime: (value) => `dt:${value.toISOString()}`,
  date: (value) => `d:${value.toISOString().slice(0, 10)}`,
};

describe('formatAuditValue', () => {
  it('translates statuses according to the audited table', () => {
    expect(formatAuditValue('company', 'status', 'verified', f)).toBe('companyStatus.verified');
    expect(formatAuditValue('subscription', 'status', 'trial', f)).toBe('subscriptionStatus.trial');
  });

  it('translates offers, roles and booleans', () => {
    expect(formatAuditValue('subscription', 'plan_code', 'v2', f)).toBe('plans.v2');
    expect(formatAuditValue('member', 'role', 'owner', f)).toBe('roles.owner');
    expect(formatAuditValue('member', 'is_active', true, f)).toBe('yes');
  });

  it('formats dates and the commission rate', () => {
    expect(formatAuditValue('subscription', 'current_period_end', '2026-10-31', f)).toBe(
      'd:2026-10-31',
    );
    expect(formatAuditValue('subscription', 'trial_ends_at', '2026-11-08T21:30:38Z', f)).toBe(
      'dt:2026-11-08T21:30:38.000Z',
    );
    expect(formatAuditValue('company', 'commission_rate', 0.15, f)).toBe('15 %');
  });

  it('shows an empty marker for missing values', () => {
    expect(formatAuditValue('company', 'ice', null, f)).toBe('∅');
    expect(formatAuditValue('company', 'ice', undefined, f)).toBe('∅');
  });
});
