export const DEMO_REPORT_TIMEZONE = 'Europe/Moscow' as const;

export type DemoOwnerPeriodMode = 'previous-month' | 'current';

export type DemoOwnerPeriod = {
  mode: DemoOwnerPeriodMode;
  key: string;
  from: string;
  toExclusive: string;
  timezone: typeof DEMO_REPORT_TIMEZONE;
  label: string;
};

function moscowYearMonth(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEMO_REPORT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  if (!year || !month) throw new Error('Не удалось определить demo-период по Москве.');
  return { year, month };
}

function normalizedYearMonth(year: number, month: number) {
  const normalized = new Date(Date.UTC(year, month - 1, 15));
  return { year: normalized.getUTCFullYear(), month: normalized.getUTCMonth() + 1 };
}

function moscowMonthStart(year: number, month: number) {
  const normalized = normalizedYearMonth(year, month);
  // Europe/Moscow is UTC+03:00 for every period covered by this demo.
  return new Date(Date.UTC(normalized.year, normalized.month - 1, 1, -3)).toISOString();
}

function russianMonthLabel(year: number, month: number) {
  const monthName = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;
}

export function getDemoOwnerPeriod(mode: DemoOwnerPeriodMode = 'previous-month', now = new Date()): DemoOwnerPeriod {
  const current = moscowYearMonth(now);
  const selected = mode === 'previous-month'
    ? normalizedYearMonth(current.year, current.month - 1)
    : current;
  const next = normalizedYearMonth(selected.year, selected.month + 1);
  return {
    mode,
    key: `${selected.year}-${String(selected.month).padStart(2, '0')}`,
    from: moscowMonthStart(selected.year, selected.month),
    toExclusive: moscowMonthStart(next.year, next.month),
    timezone: DEMO_REPORT_TIMEZONE,
    label: russianMonthLabel(selected.year, selected.month),
  };
}

export function parseDemoOwnerPeriod(value: string | null | undefined) {
  const normalized = value?.trim() || 'previous-month';
  if (normalized !== 'previous-month' && normalized !== 'current') return null;
  return normalized as DemoOwnerPeriodMode;
}
