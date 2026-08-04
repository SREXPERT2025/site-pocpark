export const ANALYTICS_CONSENT_STORAGE_KEY = 'rospark_cookie_consent';
export const ANALYTICS_CONSENT_CHANGE_EVENT = 'rospark:analytics_consent_change';
export const ANALYTICS_CONSENT_OPEN_EVENT = 'rospark:analytics_consent_open';
export const ANALYTICS_CONSENT_SETTINGS_HASH = '#cookie-settings';

export type AnalyticsConsentValue = 'accepted' | 'declined';

export function isAnalyticsConsentSettingsHash(hash: string) {
  return hash === ANALYTICS_CONSENT_SETTINGS_HASH;
}

export function readAnalyticsConsent(): AnalyticsConsentValue | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return readAnalyticsConsent() === 'accepted';
}

export function saveAnalyticsConsent(value: AnalyticsConsentValue) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable in private modes or restricted browsers.
  }

  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_CHANGE_EVENT, {
      detail: { consent: value },
    })
  );
}
