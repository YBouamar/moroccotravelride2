import { COMPANY_STATUSES, MEMBER_ROLES, SUBSCRIPTION_STATUSES } from '@mtr/shared';
import { describe, expect, it } from 'vitest';
import { Constants } from './types';

// Guards against drift between the database enums and the constants used by the apps.
describe('database enums', () => {
  it('match the member roles of @mtr/shared', () => {
    expect([...Constants.public.Enums.member_role]).toEqual([...MEMBER_ROLES]);
  });

  it('match the company statuses of @mtr/shared', () => {
    expect([...Constants.public.Enums.company_status]).toEqual([...COMPANY_STATUSES]);
  });

  it('match the subscription statuses of @mtr/shared', () => {
    expect([...Constants.public.Enums.subscription_status]).toEqual([...SUBSCRIPTION_STATUSES]);
  });
});
