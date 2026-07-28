'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type LeadStatus = 'new' | 'assigned' | 'contacted' | 'closed';
type LeadKind = 'site_form' | 'demo_feedback';
type CloseOutcome =
  | 'processed'
  | 'no_contact'
  | 'not_target'
  | 'duplicate'
  | 'test';

type LeadItem = {
  id: string;
  publicId: string;
  name: string | null;
  phone: string;
  status: LeadStatus;
  assignedTo: string | null;
  assignedAt: string | null;
  firstContactAt: string | null;
  closedAt: string | null;
  closeOutcome: CloseOutcome | null;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
  latestKind: LeadKind;
  latestSource: string;
  latestSourcePage: string | null;
  latestContext: Record<string, string | string[]>;
  latestIsDuplicate: boolean;
};

type LeadResponse = {
  items: LeadItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: {
    statuses: Partial<Record<LeadStatus, number>>;
    outbox: Partial<Record<'pending' | 'processing' | 'failed' | 'dead', number>>;
  };
  analytics: {
    funnel: {
      received: number;
      assigned: number;
      contacted: number;
      closed: number;
    };
    submissions: {
      received: number;
      duplicates: number;
    };
    firstContactSla: {
      targetWorkingMinutes: 60;
      eligible: number;
      met: number;
      breached: number;
      pending: number;
      averageWorkingMinutes: number | null;
    };
    sources: Array<{
      source: string;
      sourcePage: string | null;
      submissions: number;
      duplicates: number;
    }>;
  };
};

type Filters = {
  search: string;
  status: string;
  kind: string;
  from: string;
  to: string;
  page: number;
};

const statusLabels: Record<LeadStatus, string> = {
  new: 'Новый',
  assigned: 'Назначен',
  contacted: 'Есть контакт',
  closed: 'Закрыт',
};

const outcomeLabels: Record<CloseOutcome, string> = {
  processed: 'Обработан',
  no_contact: 'Нет связи',
  not_target: 'Нецелевой',
  duplicate: 'Дубль',
  test: 'Тест',
};

const outcomeOptions = Object.entries(outcomeLabels) as Array<
  [CloseOutcome, string]
>;

function dateTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function phone(value: string) {
  if (!/^7\d{10}$/.test(value)) return value;
  return `+7 (${value.slice(1, 4)}) ${value.slice(4, 7)}-${value.slice(7, 9)}-${value.slice(9)}`;
}

function percentage(value: number, total: number) {
  if (total === 0) return '—';
  return `${Math.round((value / total) * 100)}%`;
}

function queryString(filters: Filters) {
  const params = new URLSearchParams({ page: String(filters.page), pageSize: '25' });
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return params.toString();
}

export default function LeadAdminDashboard({
  displayName,
  role,
}: {
  displayName: string;
  role: 'director' | 'sales_head';
}) {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    kind: '',
    from: '',
    to: '',
    page: 1,
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [data, setData] = useState<LeadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyLead, setBusyLead] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, CloseOutcome>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/leads?${queryString(filters)}`, {
        cache: 'no-store',
      });
      if (response.status === 401) {
        window.location.replace('/admin/leads/login');
        return;
      }
      const payload = await response.json().catch(() => null) as
        | (LeadResponse & { error?: string })
        | null;
      if (!response.ok || !payload) {
        setError(payload?.error || 'Не удалось загрузить реестр.');
        return;
      }
      setData(payload);
    } catch {
      setError('Сервер временно недоступен.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutateLead(
    lead: LeadItem,
    body: Record<string, string>,
    method: 'PATCH' | 'DELETE' = 'PATCH',
  ) {
    setBusyLead(lead.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/leads/${lead.id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null) as {
        error?: string;
      } | null;
      if (response.status === 401) {
        window.location.replace('/admin/leads/login');
        return;
      }
      if (!response.ok) {
        setError(payload?.error || 'Операция не выполнена.');
        return;
      }
      await load();
    } catch {
      setError('Сервер временно недоступен.');
    } finally {
      setBusyLead(null);
    }
  }

  async function logout() {
    await fetch('/api/admin/leads/session', { method: 'DELETE' }).catch(() => null);
    window.location.replace('/admin/leads/login');
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({ ...current, search: searchDraft.trim(), page: 1 }));
  }

  function exportCsv() {
    const exportFilters = { ...filters, page: 1 };
    window.location.assign(
      `/api/admin/leads/export?${queryString(exportFilters)}`,
    );
  }

  function deleteLead(lead: LeadItem) {
    const confirmation = window.prompt(
      `Безвозвратно удалить лид? Введите ${lead.publicId}`,
    );
    if (confirmation !== lead.publicId) return;
    void mutateLead(lead, {
      confirmation,
      reason: 'director_decision',
    }, 'DELETE');
  }

  const statusCards = useMemo(() => ([
    ['new', 'Новые'],
    ['assigned', 'Назначены'],
    ['contacted', 'Есть контакт'],
    ['closed', 'Закрыты'],
  ] as const), []);

  return (
    <main id="main-content" className="min-h-screen bg-slate-100 text-slate-950">
      <div className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
              РОСПАРК · служебный контур
            </p>
            <h1 className="mt-1 text-2xl font-bold">Реестр лидов</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-2">
              {displayName} · {role === 'director' ? 'директор' : 'РОП'}
            </span>
            <a
              href="/admin/ai-widget"
              className="rounded-lg border border-white/20 px-4 py-2 font-medium hover:bg-white/10"
            >
              Диалоги AI
            </a>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/20 px-4 py-2 font-medium hover:bg-white/10"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Сводка">
          {statusCards.map(([status, label]) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilters((current) => ({
                ...current,
                status: current.status === status ? '' : status,
                page: 1,
              }))}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                filters.status === status
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="text-sm text-slate-500">{label}</div>
              <div className="mt-1 text-3xl font-bold">
                {data?.summary.statuses[status] ?? 0}
              </div>
            </button>
          ))}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Ожидают отправки</div>
            <div className="mt-1 text-3xl font-bold">
              {(data?.summary.outbox.pending ?? 0) + (data?.summary.outbox.processing ?? 0)}
            </div>
          </div>
          <div className={`rounded-2xl border p-4 shadow-sm ${
            (data?.summary.outbox.dead ?? 0) > 0
              ? 'border-red-300 bg-red-50'
              : 'border-slate-200 bg-white'
          }`}>
            <div className="text-sm text-slate-500">Ошибки доставки</div>
            <div className="mt-1 text-3xl font-bold">
              {(data?.summary.outbox.failed ?? 0) + (data?.summary.outbox.dead ?? 0)}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Аналитика обработки">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Обработка за выбранный период</h2>
              <p className="mt-1 text-sm text-slate-500">
                Рабочее время: пн–пт, 10:00–18:00 по Москве. Персональные данные в показатели не входят.
              </p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800">
              SLA первого контакта · 1 рабочий час
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {([
              ['Получено лидов', data?.analytics.funnel.received ?? 0],
              ['Назначено', data?.analytics.funnel.assigned ?? 0],
              ['Первый контакт', data?.analytics.funnel.contacted ?? 0],
              ['Закрыто', data?.analytics.funnel.closed ?? 0],
              ['Повторных заявок', data?.analytics.submissions.duplicates ?? 0],
              [
                'Среднее до контакта',
                data?.analytics.firstContactSla.averageWorkingMinutes === null
                  || data?.analytics.firstContactSla.averageWorkingMinutes === undefined
                  ? '—'
                  : `${data.analytics.firstContactSla.averageWorkingMinutes} мин`,
              ],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-1 text-2xl font-bold">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(360px,1.2fr)]">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-semibold">Соблюдение SLA</div>
              <div className="mt-3 flex items-end gap-3">
                <div className="text-4xl font-bold text-blue-700">
                  {percentage(
                    data?.analytics.firstContactSla.met ?? 0,
                    (data?.analytics.firstContactSla.met ?? 0)
                      + (data?.analytics.firstContactSla.breached ?? 0),
                  )}
                </div>
                <div className="pb-1 text-sm text-slate-500">
                  {data?.analytics.firstContactSla.met ?? 0} из {
                    (data?.analytics.firstContactSla.met ?? 0)
                      + (data?.analytics.firstContactSla.breached ?? 0)
                  } проверенных
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-slate-500">Просрочено</dt>
                  <dd className="font-semibold">{data?.analytics.firstContactSla.breached ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ещё в сроке</dt>
                  <dd className="font-semibold">{data?.analytics.firstContactSla.pending ?? 0}</dd>
                </div>
              </dl>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">
                Источники заявок
              </div>
              {data?.analytics.sources.length ? (
                <div className="divide-y divide-slate-100">
                  {data.analytics.sources.map((source) => (
                    <div
                      key={`${source.source}:${source.sourcePage ?? ''}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{source.source}</div>
                        <div className="truncate text-xs text-slate-500">{source.sourcePage || 'Страница не указана'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{source.submissions}</div>
                        <div className="text-xs text-slate-500">заявок</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{source.duplicates}</div>
                        <div className="text-xs text-slate-500">повторов</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-6 text-sm text-slate-500">За период заявок нет.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form
            onSubmit={applySearch}
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_1fr_1fr_1fr_1fr_auto]"
          >
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Имя, телефон или ID"
              maxLength={100}
              className="h-11 rounded-xl border border-slate-300 px-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({
                ...current,
                status: event.target.value,
                page: 1,
              }))}
              className="h-11 rounded-xl border border-slate-300 px-3"
            >
              <option value="">Все статусы</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={filters.kind}
              onChange={(event) => setFilters((current) => ({
                ...current,
                kind: event.target.value,
                page: 1,
              }))}
              className="h-11 rounded-xl border border-slate-300 px-3"
            >
              <option value="">Все типы</option>
              <option value="site_form">Формы сайта</option>
              <option value="demo_feedback">Demo feedback</option>
            </select>
            <input
              type="date"
              aria-label="Дата от"
              value={filters.from}
              onChange={(event) => setFilters((current) => ({
                ...current,
                from: event.target.value,
                page: 1,
              }))}
              className="h-11 rounded-xl border border-slate-300 px-3"
            />
            <input
              type="date"
              aria-label="Дата до"
              value={filters.to}
              onChange={(event) => setFilters((current) => ({
                ...current,
                to: event.target.value,
                page: 1,
              }))}
              className="h-11 rounded-xl border border-slate-300 px-3"
            />
            <button
              type="submit"
              className="h-11 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700"
            >
              Найти
            </button>
          </form>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Найдено: <strong>{data?.total ?? 0}</strong>
            </p>
            <button
              type="button"
              onClick={exportCsv}
              className="h-10 rounded-xl border border-blue-600 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Скачать CSV
            </button>
          </div>
        </section>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        ) : null}

        <section className="mt-5 space-y-4" aria-busy={loading}>
          {loading && !data ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Загружаем реестр…
            </div>
          ) : null}
          {!loading && data?.items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              По выбранным фильтрам лидов нет.
            </div>
          ) : null}

          {data?.items.map((lead) => {
            const selectedOutcome = outcomes[lead.id] ?? 'processed';
            const isBusy = busyLead === lead.id;
            return (
              <article
                key={lead.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(260px,1.2fr)_minmax(260px,1fr)_minmax(320px,1.3fr)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-blue-700">
                        {lead.publicId}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                        {statusLabels[lead.status]}
                      </span>
                      {lead.latestIsDuplicate ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                          повтор
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-xl font-bold">
                      {lead.name || 'Имя не указано'}
                    </h2>
                    <a
                      href={`tel:+${lead.phone}`}
                      className="mt-2 inline-block text-lg font-semibold text-blue-700 hover:underline"
                    >
                      {phone(lead.phone)}
                    </a>
                    <dl className="mt-4 grid gap-2 text-sm">
                      <div>
                        <dt className="text-slate-500">Создан</dt>
                        <dd>{dateTime(lead.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Ответственный</dt>
                        <dd>{lead.assignedTo === 'sergey' ? 'Сергей, РОП' : lead.assignedTo === 'andrey' ? 'Андрей' : 'Не назначен'}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Первый контакт</dt>
                        <dd>{dateTime(lead.firstContactAt)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">Источник</p>
                    <p className="mt-1 text-slate-700">{lead.latestSource}</p>
                    <p className="mt-1 break-all text-slate-500">
                      {lead.latestSourcePage || 'Страница не указана'}
                    </p>
                    <p className="mt-3 text-slate-600">
                      {lead.latestKind === 'demo_feedback' ? 'Demo feedback' : 'Форма сайта'}
                      {' · '}
                      заявок: {lead.submissionCount}
                    </p>
                    {typeof lead.latestContext.message === 'string' ? (
                      <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 leading-6 text-slate-700">
                        {lead.latestContext.message}
                      </p>
                    ) : null}
                    {lead.closeOutcome ? (
                      <p className="mt-4 font-medium">
                        Результат: {outcomeLabels[lead.closeOutcome]}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col justify-between gap-4 rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Следующее действие
                      </p>
                      {lead.status === 'new' ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void mutateLead(lead, {
                              action: 'assign',
                              assignedTo: 'sergey',
                            })}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {lead.assignedTo === 'sergey'
                              ? 'Принять в работу'
                              : 'Назначить Сергею'}
                          </button>
                          {role === 'director' ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void mutateLead(lead, {
                                action: 'assign',
                                assignedTo: 'andrey',
                              })}
                              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
                            >
                              Взять Андрею
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      {lead.status === 'assigned' ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void mutateLead(lead, { action: 'contact' })}
                          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Зафиксировать первый контакт
                        </button>
                      ) : null}
                      {lead.status === 'contacted' ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <select
                            value={selectedOutcome}
                            onChange={(event) => setOutcomes((current) => ({
                              ...current,
                              [lead.id]: event.target.value as CloseOutcome,
                            }))}
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                          >
                            {outcomeOptions.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void mutateLead(lead, {
                              action: 'close',
                              closeOutcome: selectedOutcome,
                            })}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                          >
                            Закрыть лид
                          </button>
                        </div>
                      ) : null}
                      {lead.status === 'closed' ? (
                        <p className="mt-3 text-sm text-slate-600">
                          Закрыт {dateTime(lead.closedAt)}.
                        </p>
                      ) : null}
                    </div>

                    {role === 'director' ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => deleteLead(lead)}
                        className="self-start text-xs font-medium text-red-700 underline underline-offset-4 hover:text-red-900 disabled:opacity-50"
                      >
                        Удалить безвозвратно
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {data && data.pageCount > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Страницы">
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => setFilters((current) => ({
                ...current,
                page: Math.max(1, current.page - 1),
              }))}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
            >
              Назад
            </button>
            <span className="text-sm text-slate-600">
              {data.page} из {data.pageCount}
            </span>
            <button
              type="button"
              disabled={data.page >= data.pageCount}
              onClick={() => setFilters((current) => ({
                ...current,
                page: Math.min(data.pageCount, current.page + 1),
              }))}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
            >
              Далее
            </button>
          </nav>
        ) : null}
      </div>
    </main>
  );
}
