import { hasAnalyticsConsent } from '@/app/lib/analytics-consent';

export type LeadFormEventName =
  | 'form_view'
  | 'form_start'
  | 'form_submit'
  | 'form_success'
  | 'form_error';

export type LeadFormEventParams = {
  form_name: string;
  landing_variant?: 'puzzle2' | 'parkovka';
  source_page?: string;
  source_section?: string;
  product_slug?: string;
  error_type?: 'validation' | 'network' | 'server' | 'unknown';
};

export type LandingEventName =
  | 'landing_view'
  | 'landing_cta_click'
  | 'landing_choice_change'
  | 'landing_entry_click';

export type LandingEventParams = {
  landing_variant: 'puzzle2' | 'parkovka';
  source_section: string;
  cta_id?: string;
  selected_choice?: string;
  selected_choices_count?: number;
  selection_action?: 'select' | 'unselect' | 'clear';
};

export type LandingEntryEventParams = {
  target_variant: 'parkovka' | 'puzzle2';
  source_section: string;
};

export type FunnelDestination = 'demo' | 'quiz';

export type FunnelLandingGroup =
  | 'home'
  | 'solutions'
  | 'features'
  | 'equipment'
  | 'cases'
  | 'articles'
  | 'landing'
  | 'company'
  | 'contacts'
  | 'other';

export type FunnelEntryParams = {
  destination: FunnelDestination;
  landing_group: FunnelLandingGroup;
};

export type AiPromoEventName =
  | 'ai_promo_view'
  | 'ai_promo_click'
  | 'ai_chat_open'
  | 'ai_quick_question_click'
  | 'ai_first_message_sent'
  | 'ai_engaged_chat'
  | 'ai_lead_handoff';

export type AiPromoEventParams = {
  landing_variant?: 'puzzle2' | 'parkovka';
  source_section:
    | 'ai_midpage'
    | 'ai_after_problem_selector'
    | 'floating_launcher';
  source_page?: string;
  selected_functions?: string[];
  selected_problem?: string;
  quick_question?: string;
  session_id?: string;
  user_message_count?: number;
  handoff_to_lead?: boolean;
};

type DataLayerWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
  __rosparkLastAnalyticsEvent?: {
    key: string;
    timestamp: number;
  };
};

const ANALYTICS_EVENT_DEDUPLICATION_WINDOW_MS = 250;
const AI_PROMO_ALLOWED_FUNCTIONS = new Set([
  'Закрыть въезд',
  'Въезд по госномеру',
  'Карты доступа',
  'Билеты для посетителей',
  'Оплата парковки',
  'Доступ для гостей',
  'Сотрудники и гости',
  'Заменить старую систему',
]);
const AI_PROMO_ALLOWED_QUESTIONS = new Set([
  'Что подойдёт для нашего объекта?',
  'Как организовать гостевой въезд?',
  'Нужны ли билеты или достаточно госномеров?',
  'Как убрать очередь на въезде?',
  'Что выбрать: госномера, карты или билеты?',
  'Как организовать въезд для гостей?',
  'Для каких объектов подходит система?',
  'Как работает гостевой доступ?',
  'От чего зависит стоимость проекта?',
  'Подобрать систему для моего объекта',
  'Нужен шлагбаум — с чего начать?',
  'Как организовать доступ сотрудников и гостей?',
  'Хочу модернизировать существующую парковку',
]);
const AI_PROMO_ALLOWED_PROBLEMS = new Set([
  'Закрыть въезд для посторонних',
  'Открывать по номеру машины',
  'Убрать ручные пропуска',
  'Принимать оплату',
  'Обойтись без билетов',
  'Заменить старую систему',
]);

export type DemoEventName =
  | 'demo_scenario_view'
  | 'demo_login'
  | 'demo_logout'
  | 'demo_request_create'
  | 'demo_request_view'
  | 'demo_request_cancel'
  | 'demo_share'
  | 'demo_search'
  | 'demo_session_select'
  | 'demo_payment_confirm'
  | 'demo_payment_complete'
  | 'demo_owner_section_view'
  | 'demo_owner_period_change'
  | 'demo_owner_detail_view'
  | 'demo_feedback_consent'
  | 'demo_feedback_lead';

export type DemoEventParams = {
  demo_name: 'guest_request_portal' | 'guest_parking_payment' | 'owner_portal';
  request_type?: 'single' | 'multiple';
  status?: 'waiting' | 'cancelled' | 'expired';
  channel?: 'copy' | 'whatsapp' | 'max';
  search_mode?: 'ticket' | 'vehicle';
  result?: 'success' | 'empty' | 'error' | 'saved' | 'failed';
  section?: 'overview' | 'tenants' | 'guest-requests' | 'parking-payments' | 'operations';
  period?: 'previous-month' | 'current';
  consent?: 'granted' | 'revoked';
};

function compactPayload(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  );
}

function safeIdentifier(value: string | undefined) {
  if (!value) return undefined;
  return /^[a-z0-9:_-]{1,80}$/i.test(value) ? value : undefined;
}

function safeSourcePage(value: string | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value, 'https://www.xn--80aukedde.xn--p1ai');
    return url.pathname.startsWith('/') ? url.pathname : undefined;
  } catch {
    return undefined;
  }
}

function leadFormPayload(params: LeadFormEventParams) {
  return compactPayload({
    form_name: safeIdentifier(params.form_name),
    landing_variant: params.landing_variant,
    source_page: safeSourcePage(params.source_page),
    source_section: safeIdentifier(params.source_section),
    product_slug: safeIdentifier(params.product_slug),
    error_type: params.error_type,
  });
}

function landingPayload(params: LandingEventParams) {
  const allowedChoice = [
    ...AI_PROMO_ALLOWED_FUNCTIONS,
    ...AI_PROMO_ALLOWED_PROBLEMS,
  ].includes(params.selected_choice || '')
    ? params.selected_choice
    : undefined;
  return compactPayload({
    landing_variant: params.landing_variant,
    source_section: safeIdentifier(params.source_section),
    cta_id: safeIdentifier(params.cta_id),
    selected_choice: allowedChoice,
    selected_choices_count: Number.isInteger(params.selected_choices_count)
      && Number(params.selected_choices_count) >= 0
      && Number(params.selected_choices_count) <= 12
      ? params.selected_choices_count
      : undefined,
    selection_action: params.selection_action,
  });
}

function landingEntryPayload(params: LandingEntryEventParams) {
  return compactPayload({
    target_variant: params.target_variant,
    source_section: safeIdentifier(params.source_section),
  });
}

function demoPayload(params: DemoEventParams) {
  return compactPayload({
    demo_name: params.demo_name,
    request_type: params.request_type,
    status: params.status,
    channel: params.channel,
    search_mode: params.search_mode,
    result: params.result,
    section: params.section,
    period: params.period,
    consent: params.consent,
  });
}

function funnelEntryPayload(params: FunnelEntryParams) {
  return {
    destination: params.destination,
    landing_group: params.landing_group,
  };
}

function aiPromoPayload(params: AiPromoEventParams) {
  const selectedFunctions = (params.selected_functions || [])
    .map((value) => value.trim())
    .filter((value) => AI_PROMO_ALLOWED_FUNCTIONS.has(value))
    .slice(0, 12);
  const validLandingPromo = (
    params.landing_variant === 'puzzle2'
    && params.source_section === 'ai_midpage'
  ) || (
    params.landing_variant === 'parkovka'
    && params.source_section === 'ai_after_problem_selector'
  );
  const validFloatingLauncher = params.source_section === 'floating_launcher';
  const validSource = validLandingPromo || validFloatingLauncher;
  return compactPayload({
    landing_variant: validSource ? params.landing_variant : undefined,
    source_section: validSource ? params.source_section : undefined,
    source_page: validSource ? safeSourcePage(params.source_page) : undefined,
    selected_functions: params.landing_variant === 'puzzle2'
      ? selectedFunctions.join(' | ') || 'none'
      : undefined,
    selected_functions_count: params.landing_variant === 'puzzle2'
      ? selectedFunctions.length
      : undefined,
    selected_problem: params.selected_problem
      && AI_PROMO_ALLOWED_PROBLEMS.has(params.selected_problem)
      ? params.selected_problem
      : undefined,
    quick_question: params.quick_question
      && AI_PROMO_ALLOWED_QUESTIONS.has(params.quick_question)
      ? params.quick_question
      : undefined,
    session_id: safeIdentifier(params.session_id),
    user_message_count: params.user_message_count === 2
      ? 2
      : undefined,
    handoff_to_lead: params.handoff_to_lead === true ? true : undefined,
  });
}

export function classifyFunnelDestination(
  href: string,
  currentOrigin: string,
): FunnelDestination | null {
  try {
    const url = new URL(href, currentOrigin);

    if (url.origin !== currentOrigin) return null;
    if (url.pathname === '/quiz' || url.pathname.startsWith('/quiz/')) {
      return 'quiz';
    }
    if (url.pathname === '/demo' || url.pathname.startsWith('/demo/')) {
      return 'demo';
    }
  } catch {
    return null;
  }

  return null;
}

export function classifyFunnelLandingGroup(
  pathname: string,
): FunnelLandingGroup {
  if (pathname === '/') return 'home';
  if (pathname === '/resheniya' || pathname.startsWith('/resheniya/')) {
    return 'solutions';
  }
  if (pathname === '/vozmozhnosti' || pathname.startsWith('/vozmozhnosti/')) {
    return 'features';
  }
  if (pathname === '/oborudovanie' || pathname.startsWith('/oborudovanie/')) {
    return 'equipment';
  }
  if (pathname === '/keysy' || pathname.startsWith('/keysy/')) return 'cases';
  if (pathname === '/stati' || pathname.startsWith('/stati/')) return 'articles';
  if (
    pathname === '/proshche' ||
    pathname.startsWith('/proshche/') ||
    pathname === '/puzzle' ||
    pathname.startsWith('/puzzle/') ||
    pathname === '/test2' ||
    pathname.startsWith('/test2/') ||
    pathname === '/v4-1' ||
    pathname.startsWith('/v4-1/') ||
    pathname === '/parkovka' ||
    pathname.startsWith('/parkovka/') ||
    pathname === '/puzzle2' ||
    pathname.startsWith('/puzzle2/') ||
    pathname === '/parkovka-pod-klyuch' ||
    pathname.startsWith('/parkovka-pod-klyuch/')
  ) {
    return 'landing';
  }
  if (pathname === '/o-kompanii' || pathname.startsWith('/o-kompanii/')) {
    return 'company';
  }
  if (pathname === '/contacts' || pathname.startsWith('/contacts/')) {
    return 'contacts';
  }

  return 'other';
}

function dispatchPrivacySafeEvent(
  customEventName:
    | 'rospark:lead_form_event'
    | 'rospark:demo_event'
    | 'rospark:funnel_event',
  eventName: LeadFormEventName | DemoEventName | AiPromoEventName | LandingEventName | 'funnel_entry',
  params: Record<string, unknown>
) {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;

  const detail = {
    event: eventName,
    ...params,
  };

  const browserWindow = window as DataLayerWindow;
  const eventKey = JSON.stringify([customEventName, eventName, params]);
  const timestamp = Date.now();
  const lastEvent = browserWindow.__rosparkLastAnalyticsEvent;

  if (
    lastEvent?.key === eventKey &&
    timestamp - lastEvent.timestamp < ANALYTICS_EVENT_DEDUPLICATION_WINDOW_MS
  ) {
    return;
  }

  browserWindow.__rosparkLastAnalyticsEvent = {
    key: eventKey,
    timestamp,
  };

  const dataLayer = Array.isArray(browserWindow.dataLayer)
    ? browserWindow.dataLayer
    : [];
  browserWindow.dataLayer = dataLayer;
  dataLayer.push({
    event: `rospark_${eventName}`,
    ...params,
  });

  window.dispatchEvent(
    new CustomEvent(customEventName, {
      detail,
    })
  );
}

export function dispatchLeadFormEvent(
  eventName: LeadFormEventName,
  params: LeadFormEventParams
) {
  dispatchPrivacySafeEvent(
    'rospark:lead_form_event',
    eventName,
    leadFormPayload(params)
  );
}

export function dispatchDemoEvent(eventName: DemoEventName, params: DemoEventParams) {
  dispatchPrivacySafeEvent(
    'rospark:demo_event',
    eventName,
    demoPayload(params)
  );
}

export function dispatchFunnelEntry(params: FunnelEntryParams) {
  dispatchPrivacySafeEvent(
    'rospark:funnel_event',
    'funnel_entry',
    funnelEntryPayload(params),
  );
}

export function dispatchAiPromoEvent(
  eventName: AiPromoEventName,
  params: AiPromoEventParams,
) {
  dispatchPrivacySafeEvent(
    'rospark:funnel_event',
    eventName,
    aiPromoPayload(params),
  );
}

export function dispatchLandingEvent(
  eventName: LandingEventName,
  params: LandingEventParams,
) {
  dispatchPrivacySafeEvent(
    'rospark:funnel_event',
    eventName,
    landingPayload(params),
  );
}

export function dispatchLandingEntryEvent(params: LandingEntryEventParams) {
  dispatchPrivacySafeEvent(
    'rospark:funnel_event',
    'landing_entry_click',
    landingEntryPayload(params),
  );
}
