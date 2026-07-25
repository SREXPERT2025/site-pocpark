'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  hasAnalyticsConsent,
} from '@/app/lib/analytics-consent';
import {
  flushYandexMetrikaGoalsFromDataLayer,
  initializeYandexMetrika,
  isYandexMetrikaProductionHost,
  parseYandexMetrikaId,
  sendYandexMetrikaHit,
} from '@/app/lib/yandex-metrika';

const counterId = parseYandexMetrikaId(
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID,
);

export default function YandexMetrika() {
  const pathname = usePathname();
  const isPrivatePath = pathname.startsWith('/admin');
  const previousPathname = useRef<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setIsEnabled(
        !isPrivatePath &&
          isYandexMetrikaProductionHost(window.location.hostname) &&
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
    if (isPrivatePath || !isEnabled || !counterId) return;

    initializeYandexMetrika(window, document, counterId);
  }, [isEnabled, isPrivatePath]);

  useEffect(() => {
    if (isPrivatePath || !isEnabled || !counterId) {
      previousPathname.current = null;
      return;
    }

    if (previousPathname.current === null) {
      previousPathname.current = pathname;
      return;
    }

    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    sendYandexMetrikaHit(
      window,
      counterId,
      `${window.location.origin}${pathname}`,
    );
  }, [isEnabled, isPrivatePath, pathname]);

  useEffect(() => {
    if (isPrivatePath || !isEnabled || !counterId) return;

    const flushQueuedAnalyticsEvents = () => {
      flushYandexMetrikaGoalsFromDataLayer(window, counterId);
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
