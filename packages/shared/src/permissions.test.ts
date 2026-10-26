import { describe, expect, it } from 'vitest';
import { can, canAssignRole } from './permissions';

describe('can', () => {
  it('lets owners and managers update the company, not other roles', () => {
    expect(can('owner', 'company.update')).toBe(true);
    expect(can('manager', 'company.update')).toBe(true);
    expect(can('dispatcher', 'company.update')).toBe(false);
    expect(can('accountant', 'company.update')).toBe(false);
    expect(can('driver', 'company.update')).toBe(false);
  });

  it('reserves the subscription to owners', () => {
    expect(can('owner', 'subscription.manage')).toBe(true);
    expect(can('manager', 'subscription.manage')).toBe(false);
  });

  it('mirrors the clients RLS: dispatchers manage, accountants read, drivers see nothing', () => {
    expect(can('dispatcher', 'clients.manage')).toBe(true);
    expect(can('accountant', 'clients.read')).toBe(true);
    expect(can('accountant', 'clients.manage')).toBe(false);
    expect(can('driver', 'clients.read')).toBe(false);
  });

  it('denies everything without a role', () => {
    expect(can(null, 'company.read')).toBe(false);
    expect(can(undefined, 'members.read')).toBe(false);
  });
});

describe('canAssignRole', () => {
  it('only lets owners grant the owner role', () => {
    expect(canAssignRole('owner', 'owner')).toBe(true);
    expect(canAssignRole('manager', 'owner')).toBe(false);
  });

  it('lets managers assign non-owner roles', () => {
    expect(canAssignRole('manager', 'driver')).toBe(true);
    expect(canAssignRole('dispatcher', 'driver')).toBe(false);
  });
});
