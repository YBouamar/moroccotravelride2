'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { MAP_ATTRIBUTION, MAP_TILES_URL, MOROCCO_CENTER } from '@/lib/map';
import { refreshLiveTripsAction } from '../actions';
import type { LiveTrip } from '../queries';

const REFRESH_MS = 15_000;

// Served from public/vendor (scripts/copy-maplibre-worker.mjs): MapLibre cannot find its worker
// next to the chunks renamed by Turbopack.
maplibregl.setWorkerUrl(`/vendor/maplibre-gl/${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);

/** Live positions of the trips in progress (step 20), refreshed every 15 seconds. */
export function LiveMap({ initial }: { initial: LiveTrip[] }) {
  const t = useTranslations('tracking');
  const format = useFormatter();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, maplibregl.Marker>());
  const [trips, setTrips] = useState(initial);

  useEffect(() => {
    if (!container.current) return;
    const instance = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [MAP_TILES_URL],
            tileSize: 256,
            attribution: MAP_ATTRIBUTION,
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: MOROCCO_CENTER,
      zoom: 5.5,
    });
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    map.current = instance;
    const timer = window.setInterval(() => {
      void refreshLiveTripsAction().then(setTrips);
    }, REFRESH_MS);
    const current = markers.current;
    return () => {
      window.clearInterval(timer);
      current.forEach((marker) => marker.remove());
      current.clear();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const seen = new Set<string>();
    for (const trip of trips) {
      if (!trip.position) continue;
      seen.add(trip.id);
      const lngLat: [number, number] = [trip.position.lng, trip.position.lat];
      const existing = markers.current.get(trip.id);
      if (existing) existing.setLngLat(lngLat);
      else {
        // Brand token from the theme (never a hard-coded colour).
        const color = getComputedStyle(document.documentElement)
          .getPropertyValue('--mtr-secondary')
          .trim();
        const marker = new maplibregl.Marker({ color: color || undefined })
          .setLngLat(lngLat)
          .setPopup(new maplibregl.Popup({ offset: 24 }).setText(`${trip.label}\n${trip.route}`))
          .addTo(instance);
        markers.current.set(trip.id, marker);
      }
    }
    for (const [id, marker] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
  }, [trips]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div
        ref={container}
        className="h-[28rem] w-full overflow-hidden rounded-card border border-border"
        role="region"
        aria-label={t('mapLabel')}
      />
      <ul className="flex flex-col gap-2" aria-live="polite">
        {trips.length === 0 ? <li className="text-sm text-muted">{t('none')}</li> : null}
        {trips.map((trip) => (
          <li key={trip.id} className="rounded-control border border-border bg-surface p-3 text-sm">
            <p className="font-semibold">{trip.label}</p>
            <p>{trip.route}</p>
            <p className="text-muted">
              {trip.position
                ? t('lastSeen', {
                    time: format.dateTime(new Date(trip.position.at), { timeStyle: 'short' }),
                  })
                : t('noPosition')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
