'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode } from 'react';

gsap.registerPlugin(ScrollTrigger);

/**
 * Backdrop layer that drifts slower than the page while the hero scrolls away.
 * Taller than the hero (112 %) so the drift never uncovers an edge. Vertical only (no RTL mirror).
 * Skipped entirely when the visitor prefers reduced motion.
 */
export function HeroParallax({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    const hero = layer?.parentElement;
    if (!layer || !hero) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to(layer, {
        yPercent: 10,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
      });
    });
    return () => media.revert();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[112%]">
      {children}
    </div>
  );
}
