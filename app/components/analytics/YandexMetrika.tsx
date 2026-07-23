'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  hasAnalyticsConsent,
} from '@/app/lib/analytics-consent';
import {
  initializeYandexMetrika,
  parseYandexMetrikaId,
  sendYandexMetrikaGoal,
  sendYandexMetrikaHit,
} from '@/app/lib/yandex-metrika';

const counterId = parseYandexMetrikaId(
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID,
);

type AnalyticsEventDetail = {
  event?: unknown;
  [key: string]: unknown;
};

function analyticsGoalFromEvent(event: Event) {
  if (!(event instanceof CustomEvent)) return null;

  const detail = event.detail as AnalyticsEventDetail | undefined;
  if (!detail || typeof detail.event !== 'string') return null;
  if (!/^[a-z0-9_-]{1,80}$/i.test(detail.event)) return null;

  const { event: eventName, ...params } = detail;
  return {
    name: `rospark_${eventName}`,
    params,
  };
}

export default function YandexMetrika() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setIsEnabled(hasAnalyticsConsent());
    };

    syncConsent();
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, syncConsent);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, syncConsent);
    };
  }, []);

  useEffect(() => {
    if (!isEnabled || !counterId) return;

    initializeYandexMetrika(window, document, counterId);
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled || !counterId) {
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
  }, [isEnabled, pathname]);

  useEffect(() => {
    if (!isEnabled || !counterId) return;

    const forwardAnalyticsEvent = (event: Event) => {
      const goal = analyticsGoalFromEvent(event);
      if (!goal) return;

      sendYandexMetrikaGoal(window, counterId, goal.name, goal.params);
    };

    window.addEventListener('rospark:lead_form_event', forwardAnalyticsEvent);
    window.addEventListener('rospark:demo_event', forwardAnalyticsEvent);

    return () => {
      window.removeEventListener(
        'rospark:lead_form_event',
        forwardAnalyticsEvent,
      );
      window.removeEventListener('rospark:demo_event', forwardAnalyticsEvent);
    };
  }, [isEnabled]);

  return null;
}
