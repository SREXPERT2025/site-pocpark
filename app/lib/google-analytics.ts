export const GOOGLE_ANALYTICS_SCRIPT_ID = 'rospark-google-analytics';
export const GOOGLE_ANALYTICS_DATA_LAYER = 'rosparkGoogleDataLayer';
export const GOOGLE_ANALYTICS_PRODUCTION_HOST =
  'www.xn--80aukedde.xn--p1ai';

type GoogleTagCommand = (...args: unknown[]) => void;

type GoogleAnalyticsWindow = Window & {
  dataLayer?: unknown[];
  rosparkGoogleDataLayer?: unknown[];
  gtag?: GoogleTagCommand;
  __rosparkGoogleAnalyticsInitialized?: Record<string, true>;
  __rosparkGoogleAnalyticsForwardedDataLayerEvents?: WeakSet<object>;
};

export type GoogleAnalyticsEvent = {
  name: string;
  params: Record<string, unknown>;
};

export function parseGoogleAnalyticsId(value: string | undefined) {
  if (!value) return null;

  const measurementId = value.trim().toUpperCase();
  return /^G-[A-Z0-9]{4,20}$/.test(measurementId)
    ? measurementId
    : null;
}

export function isGoogleAnalyticsProductionHost(
  value: string | undefined,
) {
  if (!value) return false;

  return (
    value.trim().toLowerCase().replace(/\.$/, '') ===
    GOOGLE_ANALYTICS_PRODUCTION_HOST
  );
}

export function googleAnalyticsEventFromDataLayerEntry(
  value: unknown,
): GoogleAnalyticsEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const { event, ...params } = value as Record<string, unknown>;
  if (typeof event !== 'string' || !/^rospark_[a-z0-9_-]{1,80}$/i.test(event)) {
    return null;
  }

  return {
    name: event,
    params,
  };
}

export function flushGoogleAnalyticsEventsFromDataLayer(
  browserWindow: GoogleAnalyticsWindow,
) {
  const dataLayer = Array.isArray(browserWindow.dataLayer)
    ? browserWindow.dataLayer
    : [];
  const forwardedEvents =
    browserWindow.__rosparkGoogleAnalyticsForwardedDataLayerEvents ??
    new WeakSet<object>();
  let forwardedCount = 0;

  browserWindow.__rosparkGoogleAnalyticsForwardedDataLayerEvents =
    forwardedEvents;

  for (const value of dataLayer) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    if (forwardedEvents.has(value)) continue;

    forwardedEvents.add(value);

    const analyticsEvent = googleAnalyticsEventFromDataLayerEntry(value);
    if (!analyticsEvent) continue;

    sendGoogleAnalyticsEvent(
      browserWindow,
      analyticsEvent.name,
      analyticsEvent.params,
    );
    forwardedCount += 1;
  }

  return forwardedCount;
}

function ensureGoogleTagQueue(browserWindow: GoogleAnalyticsWindow) {
  if (typeof browserWindow.gtag === 'function') return browserWindow.gtag;

  const dataLayer = Array.isArray(browserWindow.rosparkGoogleDataLayer)
    ? browserWindow.rosparkGoogleDataLayer
    : [];
  browserWindow.rosparkGoogleDataLayer = dataLayer;

  const gtag: GoogleTagCommand = (...args: unknown[]) => {
    dataLayer.push(args);
  };

  browserWindow.gtag = gtag;
  return gtag;
}

export function initializeGoogleAnalytics(
  browserWindow: GoogleAnalyticsWindow,
  browserDocument: Document,
  measurementId: string,
) {
  const gtag = ensureGoogleTagQueue(browserWindow);
  const initializedStreams =
    browserWindow.__rosparkGoogleAnalyticsInitialized ?? {};

  if (!initializedStreams[measurementId]) {
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
    gtag('js', new Date());
    gtag('config', measurementId, {
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      send_page_view: false,
    });
    initializedStreams[measurementId] = true;
    browserWindow.__rosparkGoogleAnalyticsInitialized = initializedStreams;
  }

  if (!browserDocument.getElementById(GOOGLE_ANALYTICS_SCRIPT_ID)) {
    const script = browserDocument.createElement('script');
    script.id = GOOGLE_ANALYTICS_SCRIPT_ID;
    script.async = true;
    script.src =
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}` +
      `&l=${GOOGLE_ANALYTICS_DATA_LAYER}`;
    script.dataset.rosparkAnalytics = 'google-analytics';
    browserDocument.head.appendChild(script);
  }
}

export function sendGoogleAnalyticsEvent(
  browserWindow: GoogleAnalyticsWindow,
  eventName: string,
  params: Record<string, unknown>,
) {
  const gtag = ensureGoogleTagQueue(browserWindow);
  gtag('event', eventName, params);
}

export function sendGoogleAnalyticsPageView(
  browserWindow: GoogleAnalyticsWindow,
  url: string,
  pathname: string,
) {
  const gtag = ensureGoogleTagQueue(browserWindow);
  gtag('event', 'page_view', {
    page_location: url,
    page_path: pathname,
  });
}
