import { centsToInput, toCasablancaLocalInput, type TripInput } from '@mtr/shared';
import type { TripRow } from './queries';

/** Default values of a new trip on `day` (9:00 to 11:00, Morocco time). */
export function emptyTripInput(day: string): TripInput {
  return {
    clientId: '',
    passengerName: '',
    passengerPhone: '',
    passengers: 1,
    luggage: 0,
    pickupCityId: '',
    pickupAddress: '',
    dropoffCityId: '',
    dropoffAddress: '',
    startsAt: `${day}T09:00`,
    endsAt: `${day}T11:00`,
    price: '',
    vehicleId: '',
    driverId: '',
    notes: '',
    conflictOverride: false,
    overrideReason: '',
  };
}

/** Form values of an existing trip (UTC instants back to Morocco wall-clock time). */
export function tripToInput(trip: TripRow): TripInput {
  return {
    clientId: trip.client_id ?? '',
    passengerName: trip.passenger_name,
    passengerPhone: trip.passenger_phone ?? '',
    passengers: trip.passengers,
    luggage: trip.luggage,
    pickupCityId: trip.pickup?.id ?? '',
    pickupAddress: trip.pickup_address,
    dropoffCityId: trip.dropoff?.id ?? '',
    dropoffAddress: trip.dropoff_address,
    startsAt: toCasablancaLocalInput(new Date(trip.starts_at)),
    endsAt: toCasablancaLocalInput(new Date(trip.ends_at)),
    price: centsToInput(trip.price_cents),
    vehicleId: trip.vehicle_id ?? '',
    driverId: trip.driver_id ?? '',
    notes: trip.notes ?? '',
    conflictOverride: trip.conflict_override,
    overrideReason: trip.override_reason ?? '',
  };
}
