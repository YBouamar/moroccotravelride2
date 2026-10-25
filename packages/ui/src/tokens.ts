/**
 * Design tokens from the brand presentation (docs/UX.md section 6, ADR-010).
 * Web (Tailwind CSS variables), mobile, e-mails and PDFs all read from here.
 */
export const brand = {
  navy: '#102A43',
  tealDeep: '#087E8B',
  teal: '#21B6A8',
  mist: '#F4F8FA',
  white: '#FFFFFF',
} as const;

export interface ThemeColors {
  primary: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  danger: string;
  dangerSurface: string;
  success: string;
  successSurface: string;
}

export const lightTheme: ThemeColors = {
  primary: brand.navy,
  secondary: brand.tealDeep,
  secondaryForeground: brand.white,
  accent: brand.teal,
  // accent is too light for white text (2.52): primary buttons use navy text (5.80)
  accentForeground: brand.navy,
  background: brand.mist,
  surface: brand.white,
  foreground: brand.navy,
  muted: '#52667A',
  border: '#D9E2EC',
  danger: '#B42318',
  dangerSurface: '#FEF3F2',
  success: '#067647',
  successSurface: '#ECFDF3',
};

export const darkTheme: ThemeColors = {
  primary: '#E6EEF4',
  secondary: '#3CC4D2',
  secondaryForeground: '#0B1D2E',
  accent: brand.teal,
  accentForeground: brand.navy,
  background: '#0B1D2E',
  surface: brand.navy,
  foreground: brand.mist,
  muted: '#9FB3C8',
  border: '#243B53',
  danger: '#FDA29B',
  dangerSurface: '#3B1418',
  success: '#75E0A7',
  successSurface: '#0B2E1F',
};

export const radii = {
  control: '12px',
  card: '12px',
  appIcon: '24px',
} as const;

export const fonts = {
  heading: 'Montserrat',
  body: 'Inter',
  arabic: 'Noto Sans Arabic',
} as const;
