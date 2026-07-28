import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const projectRoot = process.cwd();

function loadTypeScriptModule(relativePath, dependencies = {}) {
  const filename = resolve(projectRoot, relativePath);
  const source = readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
    throw new Error(`Unexpected test dependency: ${specifier}`);
  };

  new Function('require', 'module', 'exports', output)(
    localRequire,
    module,
    module.exports,
  );

  return module.exports;
}

let storedConsent = null;
const browserEvents = [];
const dataLayerLengthsAtDispatch = [];

globalThis.CustomEvent = class TestCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

globalThis.window = {
  localStorage: {
    getItem() {
      return storedConsent;
    },
    setItem(_key, value) {
      storedConsent = value;
    },
  },
  dispatchEvent(event) {
    browserEvents.push(event);
    dataLayerLengthsAtDispatch.push(
      Array.isArray(this.dataLayer) ? this.dataLayer.length : 0,
    );
    return true;
  },
};

const consent = loadTypeScriptModule('app/lib/analytics-consent.ts');
const analytics = loadTypeScriptModule('app/lib/analytics-events.ts', {
  '@/app/lib/analytics-consent': consent,
});
const googleAnalytics = loadTypeScriptModule('app/lib/google-analytics.ts');
const metrika = loadTypeScriptModule('app/lib/yandex-metrika.ts');

analytics.dispatchDemoEvent('demo_scenario_view', {
  demo_name: 'guest_request_portal',
});
assert.equal(window.dataLayer, undefined, 'dataLayer must stay absent before consent');
assert.equal(browserEvents.length, 0, 'analytics events must stay absent before consent');

consent.saveAnalyticsConsent('declined');
analytics.dispatchDemoEvent('demo_login', {
  demo_name: 'guest_request_portal',
});
assert.equal(window.dataLayer, undefined, 'dataLayer must stay absent after decline');
assert.equal(browserEvents.length, 1, 'only the local consent event is allowed after decline');
assert.equal(browserEvents[0].type, 'rospark:analytics_consent_change');

consent.saveAnalyticsConsent('accepted');
browserEvents.length = 0;

analytics.dispatchLeadFormEvent('form_submit', {
  form_name: 'lead_form',
  source_page: 'https://www.роспарк.рф/quiz?name=Visitor&gclid=private-click-id',
  source_section: 'quiz:kp',
  phone: '+7 999 000-00-00',
});

assert.deepEqual(window.dataLayer[0], {
  event: 'rospark_form_submit',
  form_name: 'lead_form',
  source_page: '/quiz',
  source_section: 'quiz:kp',
});
assert.equal('phone' in window.dataLayer[0], false, 'unexpected PII fields must be dropped');
assert.equal(
  JSON.stringify(window.dataLayer[0]).includes('private-click-id'),
  false,
  'query identifiers must be removed',
);

analytics.dispatchDemoEvent('demo_search', {
  demo_name: 'guest_parking_payment',
  search_mode: 'vehicle',
  result: 'success',
  vehicle_number: 'А123АА77',
  search_query: 'А123АА77',
});

assert.deepEqual(window.dataLayer[1], {
  event: 'rospark_demo_search',
  demo_name: 'guest_parking_payment',
  search_mode: 'vehicle',
  result: 'success',
});
assert.equal('vehicle_number' in window.dataLayer[1], false);
assert.equal('search_query' in window.dataLayer[1], false);

assert.equal(
  analytics.classifyFunnelDestination(
    '/quiz?source=kp&phone=%2B79990000000',
    'https://www.xn--80aukedde.xn--p1ai',
  ),
  'quiz',
);
assert.equal(
  analytics.classifyFunnelDestination(
    'https://www.xn--80aukedde.xn--p1ai/demo/gostevaya-zayavka?yclid=private',
    'https://www.xn--80aukedde.xn--p1ai',
  ),
  'demo',
);
assert.equal(
  analytics.classifyFunnelDestination(
    'https://example.com/demo',
    'https://www.xn--80aukedde.xn--p1ai',
  ),
  null,
  'external destinations must not be tracked',
);
assert.equal(analytics.classifyFunnelLandingGroup('/'), 'home');
assert.equal(
  analytics.classifyFunnelLandingGroup('/resheniya/biznes-centry'),
  'solutions',
);
assert.equal(
  analytics.classifyFunnelLandingGroup('/oborudovanie/private-looking-slug'),
  'equipment',
);
assert.equal(
  analytics.classifyFunnelLandingGroup('/unexpected/+79990000000'),
  'other',
);

analytics.dispatchFunnelEntry({
  destination: 'quiz',
  landing_group: 'solutions',
  source_page: '/resheniya/biznes-centry?phone=+79990000000',
  link_text: 'Отправить номер телефона',
});

assert.deepEqual(window.dataLayer[2], {
  event: 'rospark_funnel_entry',
  destination: 'quiz',
  landing_group: 'solutions',
});
assert.equal(
  JSON.stringify(window.dataLayer[2]).includes('79990000000'),
  false,
  'funnel events must not include URL or link data',
);

assert.equal(browserEvents.length, 3, 'accepted events must reach the local browser contract');
assert.equal(browserEvents[0].type, 'rospark:lead_form_event');
assert.equal(browserEvents[1].type, 'rospark:demo_event');
assert.equal(browserEvents[2].type, 'rospark:funnel_event');
assert.deepEqual(
  dataLayerLengthsAtDispatch.slice(-3),
  [1, 2, 3],
  'dataLayer must contain each event before its browser event is dispatched',
);

const beforeDuplicateEventCount = window.dataLayer.length;
analytics.dispatchDemoEvent('demo_scenario_view', {
  demo_name: 'guest_request_portal',
});
analytics.dispatchDemoEvent('demo_scenario_view', {
  demo_name: 'guest_request_portal',
});
assert.equal(
  window.dataLayer.length,
  beforeDuplicateEventCount + 1,
  'identical events emitted during the same render transition must be deduplicated',
);

const acceptedEventCount = window.dataLayer.length;
consent.saveAnalyticsConsent('declined');
analytics.dispatchDemoEvent('demo_logout', {
  demo_name: 'guest_parking_payment',
});
assert.equal(
  window.dataLayer.length,
  acceptedEventCount,
  'events must stop immediately after consent is declined',
);

assert.equal(metrika.parseYandexMetrikaId('110980303'), 110980303);
assert.equal(metrika.parseYandexMetrikaId('not-a-counter'), null);
assert.equal(
  metrika.isYandexMetrikaProductionHost('www.xn--80aukedde.xn--p1ai'),
  true,
);
assert.equal(
  metrika.isYandexMetrikaProductionHost('WWW.XN--80AUKEDDE.XN--P1AI.'),
  true,
);
assert.equal(metrika.isYandexMetrikaProductionHost('127.0.0.1'), false);
assert.equal(metrika.isYandexMetrikaProductionHost('localhost'), false);
assert.equal(
  metrika.isYandexMetrikaProductionHost('xn--80aukedde.xn--p1ai'),
  false,
);
assert.deepEqual(
  metrika.yandexMetrikaGoalFromDataLayerEntry({
    event: 'rospark_demo_scenario_view',
    demo_name: 'guest_request_portal',
  }),
  {
    name: 'rospark_demo_scenario_view',
    params: {
      demo_name: 'guest_request_portal',
    },
  },
);
assert.equal(
  metrika.yandexMetrikaGoalFromDataLayerEntry({
    event: 'third_party_event',
    phone: '+7 999 000-00-00',
  }),
  null,
  'only the controlled rospark namespace may be replayed',
);

const replayWindow = {
  dataLayer: [
    {
      event: 'third_party_event',
      phone: '+7 999 000-00-00',
    },
    {
      event: 'rospark_demo_scenario_view',
      demo_name: 'guest_request_portal',
    },
  ],
};

assert.equal(
  metrika.flushYandexMetrikaGoalsFromDataLayer(replayWindow, 110980303),
  1,
  'one queued ROSPARK goal must be forwarded',
);
assert.equal(
  metrika.flushYandexMetrikaGoalsFromDataLayer(replayWindow, 110980303),
  0,
  'the same queued dataLayer entry must not be forwarded twice',
);
assert.deepEqual(replayWindow.ym.a, [
  [
    110980303,
    'reachGoal',
    'rospark_demo_scenario_view',
    { demo_name: 'guest_request_portal' },
  ],
]);

const appendedScripts = [];
const fakeDocument = {
  getElementById(id) {
    return appendedScripts.find((script) => script.id === id) ?? null;
  },
  createElement(tagName) {
    assert.equal(tagName, 'script');
    return {
      async: false,
      dataset: {},
      id: '',
      src: '',
    };
  },
  head: {
    appendChild(script) {
      appendedScripts.push(script);
    },
  },
};
const metrikaWindow = {};

metrika.initializeYandexMetrika(
  metrikaWindow,
  fakeDocument,
  110980303,
);
metrika.initializeYandexMetrika(
  metrikaWindow,
  fakeDocument,
  110980303,
);

assert.equal(appendedScripts.length, 1, 'Metrika script must be appended once');
assert.equal(
  appendedScripts[0].src,
  'https://mc.yandex.ru/metrika/tag.js?id=110980303',
);
assert.deepEqual(metrikaWindow.ym.a[0], [
  110980303,
  'init',
  {
    accurateTrackBounce: true,
    clickmap: false,
    ecommerce: false,
    sendTitle: false,
    trackLinks: true,
    webvisor: false,
  },
]);

metrika.sendYandexMetrikaGoal(
  metrikaWindow,
  110980303,
  'rospark_form_success',
  { form_name: 'lead_form' },
);
assert.deepEqual(metrikaWindow.ym.a[1], [
  110980303,
  'reachGoal',
  'rospark_form_success',
  { form_name: 'lead_form' },
]);

assert.equal(
  googleAnalytics.parseGoogleAnalyticsId(' G-ABC123DEF4 '),
  'G-ABC123DEF4',
);
assert.equal(googleAnalytics.parseGoogleAnalyticsId('UA-123456-1'), null);
assert.equal(googleAnalytics.parseGoogleAnalyticsId('not-a-stream'), null);
assert.equal(
  googleAnalytics.isGoogleAnalyticsProductionHost(
    'www.xn--80aukedde.xn--p1ai',
  ),
  true,
);
assert.equal(
  googleAnalytics.isGoogleAnalyticsProductionHost(
    'WWW.XN--80AUKEDDE.XN--P1AI.',
  ),
  true,
);
assert.equal(
  googleAnalytics.isGoogleAnalyticsProductionHost('127.0.0.1'),
  false,
);
assert.equal(
  googleAnalytics.isGoogleAnalyticsProductionHost('localhost'),
  false,
);
assert.equal(
  googleAnalytics.isGoogleAnalyticsProductionHost(
    'xn--80aukedde.xn--p1ai',
  ),
  false,
);
assert.deepEqual(
  googleAnalytics.googleAnalyticsEventFromDataLayerEntry({
    event: 'rospark_demo_scenario_view',
    demo_name: 'guest_request_portal',
  }),
  {
    name: 'rospark_demo_scenario_view',
    params: {
      demo_name: 'guest_request_portal',
    },
  },
);
assert.equal(
  googleAnalytics.googleAnalyticsEventFromDataLayerEntry({
    event: 'third_party_event',
    phone: '+7 999 000-00-00',
  }),
  null,
  'GA4 may replay only the controlled rospark namespace',
);

const googleReplayWindow = {
  dataLayer: [
    {
      event: 'third_party_event',
      phone: '+7 999 000-00-00',
    },
    {
      event: 'rospark_demo_scenario_view',
      demo_name: 'guest_request_portal',
    },
  ],
};

assert.equal(
  googleAnalytics.flushGoogleAnalyticsEventsFromDataLayer(
    googleReplayWindow,
  ),
  1,
  'one queued ROSPARK event must be forwarded to GA4',
);
assert.equal(
  googleAnalytics.flushGoogleAnalyticsEventsFromDataLayer(
    googleReplayWindow,
  ),
  0,
  'the same queued dataLayer entry must not be forwarded to GA4 twice',
);
assert.equal(
  googleReplayWindow.dataLayer.length,
  2,
  'GA4 commands must not be mixed into the provider-neutral source dataLayer',
);
assert.deepEqual(googleReplayWindow.rosparkGoogleDataLayer[0], [
  'event',
  'rospark_demo_scenario_view',
  { demo_name: 'guest_request_portal' },
]);

const googleAnalyticsWindow = {};
const googleMeasurementId = 'G-ABC123DEF4';

googleAnalytics.initializeGoogleAnalytics(
  googleAnalyticsWindow,
  fakeDocument,
  googleMeasurementId,
);
googleAnalytics.initializeGoogleAnalytics(
  googleAnalyticsWindow,
  fakeDocument,
  googleMeasurementId,
);

assert.equal(
  appendedScripts.length,
  2,
  'Metrika and GA4 scripts must each be appended once',
);
assert.equal(
  appendedScripts[1].src,
  'https://www.googletagmanager.com/gtag/js?id=G-ABC123DEF4&l=rosparkGoogleDataLayer',
);
assert.deepEqual(googleAnalyticsWindow.rosparkGoogleDataLayer[0], [
  'consent',
  'default',
  {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  },
]);
assert.equal(googleAnalyticsWindow.rosparkGoogleDataLayer[1][0], 'js');
assert.equal(
  googleAnalyticsWindow.rosparkGoogleDataLayer[1][1] instanceof Date,
  true,
);
assert.deepEqual(googleAnalyticsWindow.rosparkGoogleDataLayer[2], [
  'config',
  googleMeasurementId,
  {
    allow_ad_personalization_signals: false,
    allow_google_signals: false,
    send_page_view: false,
  },
]);

googleAnalytics.sendGoogleAnalyticsPageView(
  googleAnalyticsWindow,
  'https://www.xn--80aukedde.xn--p1ai/demo',
  '/demo',
);
assert.deepEqual(googleAnalyticsWindow.rosparkGoogleDataLayer[3], [
  'event',
  'page_view',
  {
    page_location: 'https://www.xn--80aukedde.xn--p1ai/demo',
    page_path: '/demo',
  },
]);

console.log('analytics privacy smoke: OK');
