'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

/**
 * Road between the steps (md+): a dashed track, and a teal line that draws itself from the
 * first step to the last while the section scrolls into view. It grows from the start side, so
 * it follows the reading direction in RTL. Drawn in full without JavaScript or with reduced motion.
 */
export function RouteLine() {
  const fill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = fill.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        element,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { trigger: element, start: 'top 85%', end: 'top 45%', scrub: 0.4 },
        },
      );
    });
    return () => media.revert();
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-x-[16.667%] top-[22px] hidden h-1 md:block">
      <div className="absolute inset-0 border-t-4 border-dashed border-border" />
      <div
        ref={fill}
        className="absolute inset-0 origin-left rounded-full bg-secondary rtl:origin-right"
      />
    </div>
  );
}
