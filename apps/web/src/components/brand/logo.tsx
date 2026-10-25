import Image from 'next/image';

// Files copied from assets/brand/logos by scripts/copy-brand.mjs. Ratios come from the SVG viewBoxes.
const LOGOS = {
  horizontal: { width: 3201, height: 600 },
  vertical: { width: 1428, height: 1487 },
  symbole: { width: 880, height: 680 },
} as const;

type Layout = keyof typeof LOGOS;
// couleur: light backgrounds; negatif: navy backgrounds; blanc: photos and gradients.
type Tone = 'couleur' | 'negatif' | 'blanc';

interface LogoProps {
  layout?: Layout;
  tone?: Tone;
  /** Rendered height in CSS pixels; width follows the logo ratio. */
  height: number;
  alt: string;
  priority?: boolean;
  className?: string;
}

export function Logo({
  layout = 'horizontal',
  tone = 'couleur',
  height,
  alt,
  priority,
  className,
}: LogoProps) {
  const ratio = LOGOS[layout].width / LOGOS[layout].height;
  return (
    <Image
      src={`/brand/MTR_${layout}_${tone}.svg`}
      alt={alt}
      width={Math.round(height * ratio)}
      height={height}
      priority={priority}
      unoptimized
      className={className}
    />
  );
}
