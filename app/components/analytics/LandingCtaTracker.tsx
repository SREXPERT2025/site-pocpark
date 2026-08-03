'use client';

import { useEffect } from 'react';

import { dispatchLandingEvent } from '@/app/lib/analytics-events';

export default function LandingCtaTracker({
  variant,
}: {
  variant: 'puzzle2' | 'parkovka';
}) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-landing-cta]')
        : null;
      if (!target) return;
      dispatchLandingEvent('landing_cta_click', {
        landing_variant: variant,
        source_section: target.dataset.landingSection || 'landing_content',
        cta_id: target.dataset.landingCta || 'calculate_parking',
      });
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [variant]);

  return null;
}

