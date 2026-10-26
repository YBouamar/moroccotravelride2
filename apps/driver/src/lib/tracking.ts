import * as Location from 'expo-location';
import { flushOfflineQueue, offlineQueue } from './device-queue';
import type { LocationPoint } from './offline-queue';

/**
 * Live position while a trip is in progress (BR-201, BR-203: every 15 s or 50 m, À CONFIRMER).
 * Foreground only: tracking stops when the app is closed, and the database refuses points
 * outside the trip anyway. Points go through the offline queue (no signal on the road).
 */

const TIME_INTERVAL_MS = 15_000;
const DISTANCE_INTERVAL_M = 50;

let subscription: Location.LocationSubscription | null = null;
let trackedTrip: string | null = null;

export type TrackingStart = 'started' | 'denied';

export async function startTracking(tripId: string): Promise<TrackingStart> {
  if (trackedTrip === tripId && subscription) return 'started';
  stopTracking();
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') return 'denied';

  trackedTrip = tripId;
  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: TIME_INTERVAL_MS,
      distanceInterval: DISTANCE_INTERVAL_M,
    },
    (position) => {
      const point: LocationPoint = {
        lat: Number(position.coords.latitude.toFixed(6)),
        lng: Number(position.coords.longitude.toFixed(6)),
        accuracy: position.coords.accuracy ?? null,
        at: new Date(position.timestamp).toISOString(),
      };
      void offlineQueue
        .enqueue({ kind: 'locations', tripId, points: [point] })
        .then(() => flushOfflineQueue());
    },
  );
  return 'started';
}

export function stopTracking() {
  subscription?.remove();
  subscription = null;
  trackedTrip = null;
}

export const isTracking = (tripId: string) => trackedTrip === tripId && subscription !== null;
