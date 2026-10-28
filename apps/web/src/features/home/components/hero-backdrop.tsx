'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

/** Hero loop hosted with the app (public/videos, ADR-042): 7 s, muted, seamless. */
const VIDEO = {
  desktop: '/videos/hero-tangier-1280.mp4',
  mobile: '/videos/hero-tangier-960.mp4',
};

interface HeroBackdropProps {
  /** The poster photo: shown first, and alone when the video is skipped. */
  children: ReactNode;
  pauseLabel: string;
  playLabel: string;
}

/**
 * Video source for this visitor, or undefined when they asked for less motion or less data
 * (the poster then stays alone). Read on the client only: the server renders the poster alone.
 */
function videoSource() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || connection?.saveData) {
    return undefined;
  }
  return window.matchMedia('(min-width: 768px)').matches ? VIDEO.desktop : VIDEO.mobile;
}
const noSubscription = () => () => {};
const noVideoOnServer = () => undefined;

/**
 * Hero backdrop: poster photo, then a muted video loop once the page is interactive, drifting
 * slower than the page on scroll (vertical only, nothing to mirror in RTL). The video plays only
 * while the hero is on screen and always has a pause button (WCAG 2.2.2).
 */
export function HeroBackdrop({ children, pauseLabel, playLabel }: HeroBackdropProps) {
  const layer = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  // Picked once, at hydration: no swap if the window is resized or the preference changes later.
  const src = useSyncExternalStore(noSubscription, videoSource, noVideoOnServer);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  // Parallax drift (taller layer, 112 %, so the drift never uncovers an edge).
  useEffect(() => {
    const element = layer.current;
    const hero = element?.parentElement;
    if (!element || !hero) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to(element, {
        yPercent: 10,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
      });
    });
    return () => media.revert();
  }, []);

  // Play while the hero is on screen, unless the visitor paused it.
  useEffect(() => {
    const element = video.current;
    if (!src || !element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !pausedRef.current) void element.play().catch(() => {});
      else element.pause();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [src]);

  const toggle = () => {
    const element = video.current;
    if (!element) return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    if (pausedRef.current) element.pause();
    else void element.play().catch(() => {});
  };

  return (
    <>
      {/* Anchored at the bottom: the travelers on the bus deck stay in frame. */}
      <div ref={layer} aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[112%]">
        {children}
        {src ? (
          <video
            ref={video}
            src={src}
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setVisible(true)}
            className={cn(
              'absolute inset-0 size-full object-cover object-bottom transition-opacity duration-400',
              visible ? 'opacity-100' : 'opacity-0',
            )}
          />
        ) : null}
      </div>
      {src && visible ? (
        <button
          type="button"
          onClick={toggle}
          className="absolute end-4 top-4 z-10 inline-flex size-11 items-center justify-center rounded-full bg-navy/60 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-navy/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {paused ? (
            <Play aria-hidden="true" className="size-5" />
          ) : (
            <Pause aria-hidden="true" className="size-5" />
          )}
          <span className="sr-only">{paused ? playLabel : pauseLabel}</span>
        </button>
      ) : null}
    </>
  );
}
