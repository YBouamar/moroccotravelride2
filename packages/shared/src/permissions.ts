/**
 * Permission matrix (docs/SECURITY.md section 1). Used by the UI to show or hide actions only:
 * the real guard is RLS in the database, which mirrors these rules and is tested with pgTAP.
 * Extended phase by phase as new domains arrive.
 */
export const MEMBER_ROLES = ['owner', 'manager', 'dispatcher', 'accountant', 'driver'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const COMPANY_STATUSES = ['pending', 'verified', 'suspended'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

const MATRIX = {
  'company.read': ['owner', 'manager', 'dispatcher', 'accountant', 'driver'],
  'company.update': ['owner', 'manager'],
  'company.documents.manage': ['owner', 'manager'],
  'members.read': ['owner', 'manager', 'dispatcher', 'accountant', 'driver'],
  'members.manage': ['owner', 'manager'],
  'members.manageOwners': ['owner'],
  'subscription.manage': ['owner'],
  'vehicles.read': ['owner', 'manager', 'dispatcher', 'accountant', 'driver'],
  'vehicles.manage': ['owner', 'manager'],
  'drivers.read': ['owner', 'manager', 'dispatcher', 'accountant'],
  'drivers.manage': ['owner', 'manager'],
  'clients.read': ['owner', 'manager', 'dispatcher', 'accountant'],
  'clients.manage': ['owner', 'manager', 'dispatcher'],
  'trips.read': ['owner', 'manager', 'dispatcher', 'accountant'],
  'trips.manage': ['owner', 'manager', 'dispatcher'],
  // BR-114: only owners and managers override a planning conflict (checked again in the database).
  'trips.overrideConflicts': ['owner', 'manager'],
  'expenses.read': ['owner', 'manager', 'dispatcher', 'accountant'],
  'expenses.review': ['owner', 'manager', 'accountant'],
  'tracking.read': ['owner', 'manager', 'dispatcher'],
  'invoices.read': ['owner', 'manager', 'accountant'],
  'invoices.manage': ['owner', 'manager', 'accountant'],
  // Marketplace (Pillar A): price grids, visibility, booking acceptance.
  'marketplace.manage': ['owner', 'manager'],
  'bookings.read': ['owner', 'manager', 'dispatcher', 'accountant'],
  'bookings.respond': ['owner', 'manager', 'dispatcher'],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof MATRIX;

export function can(role: MemberRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (MATRIX[permission] as readonly MemberRole[]).includes(role);
}

/** Managers can manage members, but never grant or touch the owner role (RLS: company_members). */
export function canAssignRole(actor: MemberRole, target: MemberRole): boolean {
  if (target === 'owner') return can(actor, 'members.manageOwners');
  return can(actor, 'members.manage');
}
