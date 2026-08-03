'use client';

import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  customSize?: boolean;
  width?: string;
  spread?: number;
};

type SpotlightStyle = CSSProperties & {
  '--spotlight-x': string;
  '--spotlight-y': string;
  '--spotlight-spread': string;
};

export function SpotlightCard({
  children,
  className = '',
  customSize = false,
  width = '100%',
  spread = 16,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [supportsHover, setSupportsHover] = useState(false);
  const [mobileSweepReady, setMobileSweepReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setSupportsHover(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || supportsHover || mobileSweepReady) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setMobileSweepReady(true);
      observer.disconnect();
    }, { threshold: 0.3 });

    observer.observe(card);
    return () => observer.disconnect();
  }, [mobileSweepReady, supportsHover]);

  const moveSpotlight = (event: PointerEvent<HTMLDivElement>) => {
    if (!supportsHover || !cardRef.current) return;
    const bounds = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
    cardRef.current.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
  };

  const style: SpotlightStyle = {
    '--spotlight-x': '78%',
    '--spotlight-y': '22%',
    '--spotlight-spread': `${Math.min(20, Math.max(0, spread))}%`,
    touchAction: 'pan-y',
    width: customSize ? width : undefined,
  };

  return (
    <div
      ref={cardRef}
      className={`puzzle2-ai-spotlight ${supportsHover ? 'has-hover-spotlight' : 'has-static-spotlight'} ${mobileSweepReady ? 'is-mobile-sweep' : ''} ${className}`.trim()}
      onPointerMove={moveSpotlight}
      style={style}
    >
      {children}
    </div>
  );
}
