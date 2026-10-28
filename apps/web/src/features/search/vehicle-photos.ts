import type { StaticImageData } from 'next/image';
import serviceTransfer from '@/assets/photos/service-transfer.webp';
import coach from '@/assets/photos/vehicle-coach.webp';
import minibus from '@/assets/photos/vehicle-minibus.webp';
import sedan from '@/assets/photos/vehicle-sedan.webp';
import suv from '@/assets/photos/vehicle-suv.webp';
import van from '@/assets/photos/vehicle-van.webp';

/**
 * One representative photo per vehicle type (not the carrier's own vehicle: the vehicle is
 * assigned when the booking is accepted). Hosted with the app; credits in UX.md.
 */
const VEHICLE_PHOTOS: Record<string, StaticImageData> = {
  sedan,
  suv_4x4: suv,
  van,
  minibus,
  coach,
};

/** Photo of a vehicle type; a type added later without a photo shows a minibus on the road. */
export const vehiclePhoto = (code: string) => VEHICLE_PHOTOS[code] ?? serviceTransfer;
