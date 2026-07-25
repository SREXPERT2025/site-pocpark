'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import {
  classifyFunnelDestination,
  classifyFunnelLandingGroup,
  dispatchFunnelEntry,
} from '@/app/lib/analytics-events';

function isFunnelPath(pathname: string) {
  return (
    pathname === '/demo' ||
    pathname.startsWith('/demo/') ||
    pathname === '/quiz' ||
    pathname.startsWith('/quiz/')
  );
}

export default function FunnelEntryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/admin') || isFunnelPath(pathname)) return;

    const trackFunnelEntry = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.hasAttribute('download')) return;

      const destination = classifyFunnelDestination(
        anchor.href,
        window.location.origin,
      );
      if (!destination) return;

      dispatchFunnelEntry({
        destination,
        landing_group: classifyFunnelLandingGroup(pathname),
      });
    };

    document.addEventListener('click', trackFunnelEntry, true);

    return () => {
      document.removeEventListener('click', trackFunnelEntry, true);
    };
  }, [pathname]);

  return null;
}
