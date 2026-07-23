'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  readAnalyticsConsent,
  saveAnalyticsConsent,
  ANALYTICS_CONSENT_OPEN_EVENT,
  type AnalyticsConsentValue,
} from '@/app/lib/analytics-consent';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const savedConsent = readAnalyticsConsent();

    if (savedConsent !== 'accepted' && savedConsent !== 'declined') {
      setIsVisible(true);
    }

    const openSettings = () => setIsVisible(true);
    window.addEventListener(ANALYTICS_CONSENT_OPEN_EVENT, openSettings);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_OPEN_EVENT, openSettings);
    };
  }, []);

  const saveConsent = (value: AnalyticsConsentValue) => {
    const previousConsent = readAnalyticsConsent();
    saveAnalyticsConsent(value);
    setIsVisible(false);

    if (previousConsent === 'accepted' && value === 'declined') {
      window.location.reload();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pt-3 sm:px-6"
      role="region"
      aria-label="Уведомление об использовании cookie"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-2xl border border-border/70 bg-bg-primary/95 p-4 text-sm text-text-secondary shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl leading-relaxed">
          Мы используем cookie, чтобы сайт работал корректно, анализировать обращения и улучшать сервис.
          Вы можете принять cookie или отклонить необязательные.{' '}
          <Link
            href="/privacy"
            className="font-medium text-accent underline underline-offset-4 hover:text-accent-hover"
          >
            Подробнее — в Политике обработки персональных данных.
          </Link>
        </p>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => saveConsent('declined')}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-transparent px-4 py-2 font-medium text-text-primary transition hover:bg-bg-secondary"
          >
            Отклонить необязательные
          </button>
          <button
            type="button"
            onClick={() => saveConsent('accepted')}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent-primary px-4 py-2 font-medium text-white transition hover:bg-state-hover"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
