export const YANDEX_METRIKA_SCRIPT_ID = 'rospark-yandex-metrika';

type YandexMetrikaCommand = {
  (...args: unknown[]): void;
  a?: unknown[][];
  l?: number;
};

type YandexMetrikaWindow = Window & {
  ym?: YandexMetrikaCommand;
  __rosparkMetrikaInitialized?: Record<string, true>;
  __rosparkMetrikaForwardedDataLayerEvents?: WeakSet<object>;
  dataLayer?: unknown[];
};

export type YandexMetrikaGoal = {
  name: string;
  params: Record<string, unknown>;
};

export function parseYandexMetrikaId(value: string | undefined) {
  if (!value || !/^\d{1,12}$/.test(value)) return null;

  const counterId = Number(value);
  return Number.isSafeInteger(counterId) && counterId > 0 ? counterId : null;
}

export function yandexMetrikaGoalFromDataLayerEntry(
  value: unknown,
): YandexMetrikaGoal | null {
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

export function flushYandexMetrikaGoalsFromDataLayer(
  browserWindow: YandexMetrikaWindow,
  counterId: number,
) {
  const dataLayer = Array.isArray(browserWindow.dataLayer)
    ? browserWindow.dataLayer
    : [];
  const forwardedEvents =
    browserWindow.__rosparkMetrikaForwardedDataLayerEvents ??
    new WeakSet<object>();
  let forwardedCount = 0;

  browserWindow.__rosparkMetrikaForwardedDataLayerEvents = forwardedEvents;

  for (const value of dataLayer) {
    if (!value || typeof value !== 'object') continue;
    if (forwardedEvents.has(value)) continue;

    forwardedEvents.add(value);

    const goal = yandexMetrikaGoalFromDataLayerEntry(value);
    if (!goal) continue;

    sendYandexMetrikaGoal(browserWindow, counterId, goal.name, goal.params);
    forwardedCount += 1;
  }

  return forwardedCount;
}

function ensureYandexMetrikaQueue(browserWindow: YandexMetrikaWindow) {
  if (typeof browserWindow.ym === 'function') return browserWindow.ym;

  const queue: YandexMetrikaCommand = (...args: unknown[]) => {
    queue.a = queue.a ?? [];
    queue.a.push(args);
  };

  queue.l = Date.now();
  browserWindow.ym = queue;
  return queue;
}

export function initializeYandexMetrika(
  browserWindow: YandexMetrikaWindow,
  browserDocument: Document,
  counterId: number,
) {
  const ym = ensureYandexMetrikaQueue(browserWindow);
  const initializedCounters = browserWindow.__rosparkMetrikaInitialized ?? {};

  if (!initializedCounters[String(counterId)]) {
    ym(counterId, 'init', {
      accurateTrackBounce: true,
      clickmap: false,
      ecommerce: false,
      sendTitle: false,
      trackLinks: true,
      webvisor: false,
    });
    initializedCounters[String(counterId)] = true;
    browserWindow.__rosparkMetrikaInitialized = initializedCounters;
  }

  if (!browserDocument.getElementById(YANDEX_METRIKA_SCRIPT_ID)) {
    const script = browserDocument.createElement('script');
    script.id = YANDEX_METRIKA_SCRIPT_ID;
    script.async = true;
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`;
    script.dataset.rosparkAnalytics = 'yandex-metrika';
    browserDocument.head.appendChild(script);
  }
}

export function sendYandexMetrikaGoal(
  browserWindow: YandexMetrikaWindow,
  counterId: number,
  goalName: string,
  params: Record<string, unknown>,
) {
  const ym = ensureYandexMetrikaQueue(browserWindow);
  ym(counterId, 'reachGoal', goalName, params);
}

export function sendYandexMetrikaHit(
  browserWindow: YandexMetrikaWindow,
  counterId: number,
  url: string,
) {
  const ym = ensureYandexMetrikaQueue(browserWindow);
  ym(counterId, 'hit', url);
}
