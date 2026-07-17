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
  | 'demo_login'
  | 'demo_logout'
  | 'demo_request_create'
  | 'demo_request_view'
  | 'demo_request_cancel'
  | 'demo_share';

export type DemoEventParams = {
  demo_name: 'guest_request_portal';
  request_type?: 'single' | 'multiple';
  status?: 'waiting' | 'cancelled' | 'expired';
  channel?: 'copy' | 'whatsapp' | 'max';
};

export function dispatchLeadFormEvent(
  eventName: LeadFormEventName,
  params: LeadFormEventParams
) {
  if (typeof window === 'undefined') return;

  const detail = {
    event: eventName,
    ...params,
  };

  window.dispatchEvent(
    new CustomEvent('rospark:lead_form_event', {
      detail,
    })
  );

  const dataLayer = (window as DataLayerWindow).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({
      event: `rospark_${eventName}`,
      ...params,
    });
  }
}

export function dispatchDemoEvent(eventName: DemoEventName, params: DemoEventParams) {
  if (typeof window === 'undefined') return;

  const detail = {
    event: eventName,
    ...params,
  };

  window.dispatchEvent(
    new CustomEvent('rospark:demo_event', {
      detail,
    })
  );

  const dataLayer = (window as DataLayerWindow).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({
      event: `rospark_${eventName}`,
      ...params,
    });
  }
}
