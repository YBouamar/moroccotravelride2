import type { MetadataRoute } from 'next';
import { brand } from '@mtr/ui';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MoroccoTravelRide',
    short_name: 'MTR',
    start_url: '/',
    display: 'standalone',
    background_color: brand.mist,
    theme_color: brand.navy,
    icons: [
      { src: '/brand/MTR_icone_navy_192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/MTR_icone_navy_512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
