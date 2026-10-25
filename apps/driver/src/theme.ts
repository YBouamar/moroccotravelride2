import { brand, lightTheme, radii } from '@mtr/ui';

// Same tokens as the web (packages/ui). High contrast for reading in full sunlight (docs/UX.md 4).
export const colors = { ...lightTheme, navy: brand.navy, teal: brand.teal };

export const radius = Number.parseInt(radii.control, 10);

/** Minimum height of primary touch targets in the driver app (docs/UX.md 4: 56 px). */
export const TOUCH_TARGET = 56;
