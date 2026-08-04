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
  analytics.classifyFunnelLandingGroup('/proshche'),
  'landing',
);
assert.equal(
  analytics.classifyFunnelLandingGroup('/puzzle'),
  'landing',
);
assert.equal(
  analytics.classifyFunnelLandingGroup('/test2'),
  'landing',
);
assert.equal(
  analytics.classifyFunnelLandingGroup('/v4-1'),
  'landing',
);
assert.equal(
  analytics.classifyFunnelLandingGroup('/v4-1/variant'),
  'landing',
);
assert.equal(
  analytics.classifyFunnelLandingGroup('/puzzle2'),
  'landing',
);
assert.equal(
  analytics.classifyFunnelLandingGroup('/parkovka'),
  'landing',
);
assert.equal(
  analytics.classifyFunnelLandingGroup('/parkovka-pod-klyuch'),
  'landing',
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

analytics.dispatchAiPromoEvent('ai_quick_question_click', {
  landing_variant: 'puzzle2',
  source_section: 'ai_midpage',
  selected_functions: [
    'Въезд по госномеру',
    'Оплата парковки',
    '+7 999 000-00-00',
  ],
  quick_question: 'Как организовать гостевой въезд?',
});

assert.deepEqual(window.dataLayer[3], {
  event: 'rospark_ai_quick_question_click',
  landing_variant: 'puzzle2',
  source_section: 'ai_midpage',
  selected_functions: 'Въезд по госномеру | Оплата парковки',
  selected_functions_count: 2,
  quick_question: 'Как организовать гостевой въезд?',
});
assert.equal(
  JSON.stringify(window.dataLayer[3]).includes('79990000000'),
  false,
  'AI promo events must only include controlled function labels',
);

analytics.dispatchAiPromoEvent('ai_chat_open', {
  landing_variant: 'parkovka',
  source_section: 'ai_after_problem_selector',
  selected_problem: 'Открывать по номеру машины',
  quick_question: 'Что выбрать: госномера, карты или билеты?',
  session_id: '8fd0b9cb-8c6d-4f97-a00a-25cda7f59dc4',
});

assert.deepEqual(window.dataLayer[4], {
  event: 'rospark_ai_chat_open',
  landing_variant: 'parkovka',
  source_section: 'ai_after_problem_selector',
  selected_problem: 'Открывать по номеру машины',
  quick_question: 'Что выбрать: госномера, карты или билеты?',
  session_id: '8fd0b9cb-8c6d-4f97-a00a-25cda7f59dc4',
});

analytics.dispatchAiPromoEvent('ai_lead_handoff', {
  landing_variant: 'parkovka',
  source_section: 'ai_after_problem_selector',
  selected_problem: '+7 999 000-00-00',
  session_id: '+79990000000',
  handoff_to_lead: true,
});

assert.deepEqual(window.dataLayer[5], {
  event: 'rospark_ai_lead_handoff',
  landing_variant: 'parkovka',
  source_section: 'ai_after_problem_selector',
  handoff_to_lead: true,
});
assert.equal(
  JSON.stringify(window.dataLayer[5]).includes('79990000000'),
  false,
  'Parkovka AI attribution must drop unapproved problem labels and session data',
);

analytics.dispatchAiPromoEvent('ai_chat_open', {
  source_section: 'floating_launcher',
  source_page: 'https://www.роспарк.рф/resheniya/biznes-centry?phone=+79990000000',
  session_id: '1d0ffb5e-529c-49d4-93e3-0dd2b2e56d11',
});

assert.deepEqual(window.dataLayer[6], {
  event: 'rospark_ai_chat_open',
  source_section: 'floating_launcher',
  source_page: '/resheniya/biznes-centry',
  session_id: '1d0ffb5e-529c-49d4-93e3-0dd2b2e56d11',
});
assert.equal(
  JSON.stringify(window.dataLayer[6]).includes('79990000000'),
  false,
  'Floating AI events must remove query parameters from the source page',
);

analytics.dispatchAiPromoEvent('ai_engaged_chat', {
  landing_variant: 'puzzle2',
  source_section: 'floating_launcher',
  source_page: '/parkovka-pod-klyuch?yclid=private-click-id',
  session_id: '1d0ffb5e-529c-49d4-93e3-0dd2b2e56d11',
  user_message_count: 2,
});

assert.deepEqual(window.dataLayer[7], {
  event: 'rospark_ai_engaged_chat',
  landing_variant: 'puzzle2',
  source_section: 'floating_launcher',
  source_page: '/parkovka-pod-klyuch',
  selected_functions: 'none',
  selected_functions_count: 0,
  session_id: '1d0ffb5e-529c-49d4-93e3-0dd2b2e56d11',
  user_message_count: 2,
});
assert.equal(
  JSON.stringify(window.dataLayer[7]).includes('private-click-id'),
  false,
  'Engaged-chat analytics must not include URL identifiers',
);

analytics.dispatchLandingEvent('landing_view', {
  landing_variant: 'parkovka',
  source_section: 'page',
});
assert.deepEqual(window.dataLayer[8], {
  event: 'rospark_landing_view',
  landing_variant: 'parkovka',
  source_section: 'page',
});

analytics.dispatchLandingEvent('landing_choice_change', {
  landing_variant: 'puzzle2',
  source_section: 'function_selector',
  selected_choice: '+7 999 000-00-00',
  selected_choices_count: 99,
  selection_action: 'select',
});
assert.deepEqual(window.dataLayer[9], {
  event: 'rospark_landing_choice_change',
  landing_variant: 'puzzle2',
  source_section: 'function_selector',
  selection_action: 'select',
});
assert.equal(
  JSON.stringify(window.dataLayer[9]).includes('79990000000'),
  false,
  'landing events must drop uncontrolled choices and impossible counts',
);

analytics.dispatchLandingEntryEvent({
  target_variant: 'puzzle2',
  source_section: 'home_start',
});
assert.deepEqual(window.dataLayer[10], {
  event: 'rospark_landing_entry_click',
  target_variant: 'puzzle2',
  source_section: 'home_start',
});

assert.equal(browserEvents.length, 11, 'accepted events must reach the local browser contract');
assert.equal(browserEvents[0].type, 'rospark:lead_form_event');
assert.equal(browserEvents[1].type, 'rospark:demo_event');
assert.equal(browserEvents[2].type, 'rospark:funnel_event');
assert.equal(browserEvents[3].type, 'rospark:funnel_event');
assert.equal(browserEvents[4].type, 'rospark:funnel_event');
assert.equal(browserEvents[5].type, 'rospark:funnel_event');
assert.equal(browserEvents[6].type, 'rospark:funnel_event');
assert.equal(browserEvents[7].type, 'rospark:funnel_event');
assert.equal(browserEvents[8].type, 'rospark:funnel_event');
assert.equal(browserEvents[9].type, 'rospark:funnel_event');
assert.equal(browserEvents[10].type, 'rospark:funnel_event');
assert.deepEqual(
  dataLayerLengthsAtDispatch.slice(-11),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
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
