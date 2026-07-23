export const DEMO_FEEDBACK_CONSENT_VERSION = 'demo-feedback-v1-2026-07-23';

export const DEMO_FEEDBACK_CONSENT_TEXT =
  'Разрешаю РОСПАРК связаться со мной по указанному номеру, чтобы уточнить результат тестирования demo-сервиса';

export const DEMO_FEEDBACK_CONSENT_NOTE =
  'Номер будет использован только для обратной связи по результатам этой демонстрации';

export const DEMO_FEEDBACK_SOURCE = 'demo_guest_requests';
export const DEMO_FEEDBACK_PAGE_SOURCE = '/demo/gostevaya-zayavka';

export const DEMO_FEEDBACK_CHANNELS = ['max', 'whatsapp', 'copy'] as const;
export type DemoFeedbackChannel = (typeof DEMO_FEEDBACK_CHANNELS)[number];
