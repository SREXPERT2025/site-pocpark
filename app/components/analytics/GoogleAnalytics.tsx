'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  hasAnalyticsConsent,
} from '@/app/lib/analytics-consent';
import {
  flushGoogleAnalyticsEventsFromDataLayer,
  initializeGoogleAnalytics,
  isGoogleAnalyticsProductionHost,
  parseGoogleAnalyticsId,
  sendGoogleAnalyticsPageView,
} from '@/app/lib/google-analytics';

const measurementId = parseGoogleAnalyticsId(
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
);

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const isPrivatePath = pathname.startsWith('/admin');
  const previousPathname = useRef<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setIsEnabled(
        !isPrivatePath &&
          isGoogleAnalyticsProductionHost(window.location.hostname) &&
          hasAnalyticsConsent(),
      );
    };

    syncConsent();
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, syncConsent);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, syncConsent);
    };
  }, [isPrivatePath]);

  useEffect(() => {
    if (isPrivatePath || !isEnabled || !measurementId) return;

    initializeGoogleAnalytics(window, document, measurementId);
  }, [isEnabled, isPrivatePath]);

  useEffect(() => {
    if (isPrivatePath || !isEnabled || !measurementId) {
      previousPathname.current = null;
      return;
    }

    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    sendGoogleAnalyticsPageView(
      window,
      `${window.location.origin}${pathname}`,
      pathname,
    );
  }, [isEnabled, isPrivatePath, pathname]);

  useEffect(() => {
    if (isPrivatePath || !isEnabled || !measurementId) return;

    const flushQueuedAnalyticsEvents = () => {
      flushGoogleAnalyticsEventsFromDataLayer(window);
    };

    const forwardAnalyticsEvent = () => flushQueuedAnalyticsEvents();

    window.addEventListener('rospark:lead_form_event', forwardAnalyticsEvent);
    window.addEventListener('rospark:demo_event', forwardAnalyticsEvent);
    window.addEventListener('rospark:funnel_event', forwardAnalyticsEvent);
    flushQueuedAnalyticsEvents();

    return () => {
      window.removeEventListener(
        'rospark:lead_form_event',
        forwardAnalyticsEvent,
      );
      window.removeEventListener('rospark:demo_event', forwardAnalyticsEvent);
      window.removeEventListener('rospark:funnel_event', forwardAnalyticsEvent);
    };
  }, [isEnabled, isPrivatePath]);

  return null;
}
