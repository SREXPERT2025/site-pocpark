import { hasAnalyticsConsent } from '@/app/lib/analytics-consent';

export type LeadFormEventName =
  | 'form_view'
  | 'form_start'
  | 'form_submit'
  | 'form_success'
  | 'form_error';

export type LeadFormEventParams = {
  form_name: string;
  source_page?: string;
  source_section?: string;
  product_slug?: string;
  error_type?: 'validation' | 'network' | 'server' | 'unknown';
};

type DataLayerWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
};

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
    source_page: safeSourcePage(params.source_page),
    source_section: safeIdentifier(params.source_section),
    product_slug: safeIdentifier(params.product_slug),
    error_type: params.error_type,
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

function dispatchPrivacySafeEvent(
  customEventName: 'rospark:lead_form_event' | 'rospark:demo_event',
  eventName: LeadFormEventName | DemoEventName,
  params: Record<string, unknown>
) {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;

  const detail = {
    event: eventName,
    ...params,
  };

  window.dispatchEvent(
    new CustomEvent(customEventName, {
      detail,
    })
  );

  const browserWindow = window as DataLayerWindow;
  const dataLayer = Array.isArray(browserWindow.dataLayer)
    ? browserWindow.dataLayer
    : [];
  browserWindow.dataLayer = dataLayer;
  dataLayer.push({
    event: `rospark_${eventName}`,
    ...params,
  });
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
