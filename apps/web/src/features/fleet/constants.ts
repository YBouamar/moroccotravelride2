/** List filters and sorts shared by the fleet pages, forms and queries (step 8). */

export const VEHICLE_STATUSES = ['active', 'maintenance', 'inactive'] as const;
export const DRIVER_STATUSES = ['active', 'inactive'] as const;
export const CLIENT_FILTERS = ['active', 'inactive'] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];
export type DriverStatus = (typeof DRIVER_STATUSES)[number];
export type ClientFilter = (typeof CLIENT_FILTERS)[number];

export const SORTS = {
  vehicles: { registration: 'registration', recent: 'created_at' },
  drivers: { name: 'full_name', license: 'license_expires_on', recent: 'created_at' },
  clients: { name: 'name', recent: 'created_at' },
} as const;

export type ListEntity = keyof typeof SORTS;
