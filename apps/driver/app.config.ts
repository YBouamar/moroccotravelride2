import type { ExpoConfig } from 'expo/config';

// Brand assets are read straight from the official kit (assets/brand/logos, ADR-014): no copies.
const LOGOS = '../../assets/brand/logos/png';
const NAVY = '#102A43';

const config: ExpoConfig = {
  name: 'MTR Chauffeur',
  slug: 'moroccotravelride-driver',
  scheme: 'mtr-driver',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: `${LOGOS}/MTR_icone_app_navy.png`,
  ios: {
    bundleIdentifier: 'ma.moroccotravelride.driver',
    supportsTablet: false,
  },
  android: {
    package: 'ma.moroccotravelride.driver',
    adaptiveIcon: {
      foregroundImage: `${LOGOS}/MTR_icone_app_navy.png`,
      backgroundColor: NAVY,
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    // Foreground location only, during trips in progress (BR-201); no background tracking.
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'MTR Chauffeur partage votre position avec votre société uniquement pendant vos trajets en cours.',
      },
    ],
    [
      'expo-image-picker',
      {
        cameraPermission: 'MTR Chauffeur photographie vos justificatifs de dépenses.',
        photosPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        image: `${LOGOS}/MTR_vertical_negatif.png`,
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: NAVY,
      },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;
