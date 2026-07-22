'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarRange,
  ClipboardList,
  ExternalLink,
  RefreshCw,
  SearchX,
} from 'lucide-react';
import OwnerGuestRequestDrawer from './OwnerGuestRequestDrawer';
import OwnerRegistryPager from './OwnerRegistryPager';
import OwnerScrollableTable from './OwnerScrollableTable';
import {
  formatOwnerDateTime,
  formatOwnerDuration,
  formatOwnerInteger,
  formatOwnerMoney,
  ownerGuestRequestStatusLabel,
  ownerGuestRequestTypeLabel,
} from './owner-formatters';
import type {
  OwnerGuestRequest,
  OwnerGuestRequestSort,
  OwnerGuestRequestStatus,
  OwnerGuestRequestsResponse,
  OwnerGuestRequestType,
  OwnerPeriodMode,
  OwnerSummary,
  OwnerTenant,
  SortOrder,
} from './owner-types';

type OwnerGuestRequestsRegistryProps = {
  periodMode: OwnerPeriodMode;
  summary: OwnerSummary | null;
  tenants: OwnerTenant[];
  onUnauthorized: () => void;
};

const PAGE_SIZE = 10;

const emptyResponse: OwnerGuestRequestsResponse = {
  period: { from: '', toExclusive: '', timezone: 'Europe/Moscow', label: '' },
  items: [],
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

const requestTypeOptions: Array<{ value: OwnerGuestRequestType | ''; label: string }> = [
  { value: '', label: 'Все типы заявок' },
  { value: 'single', label: 'Одноразовые' },
  { value: 'multi', label: 'Многоразовые' },
];

const requestStatusOptions: Array<{ value: OwnerGuestRequestStatus | ''; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: 'waiting', label: 'Ожидает въезда' },
  { value: 'active', label: 'Действует' },
  { value: 'completed', label: 'Завершена' },
  { value: 'cancelled', label: 'Отменена' },
  { value: 'expired', label: 'Истекла' },
];

const sortOptions: Array<{ value: OwnerGuestRequestSort; label: string }> = [
  { value: 'createdAt', label: 'По дате создания' },
  { value: 'requestNumber', label: 'По номеру заявки' },
  { value: 'tenantShortName', label: 'По арендатору' },
  { value: 'status', label: 'По статусу' },
  { value: 'passageCount', label: 'По количеству проездов' },
  { value: 'totalAmount', label: 'По сумме начислений' },
];

class GuestRequestsError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function readRequestsResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as (
    OwnerGuestRequestsResponse & { error?: string; code?: string }
  ) | null;
  if (!response.ok || !payload) {
    throw new GuestRequestsError(
      response.status,
      payload?.code || 'INTERNAL_ERROR',
      payload?.error || 'Не удалось загрузить гостевые заявки.',
    );
  }
  return payload;
}

function requestsErrorMessage(error: unknown) {
  if (error instanceof GuestRequestsError && error.code === 'INVALID_QUERY') {
    return 'Параметры реестра устарели. Сбросьте фильтры и повторите запрос.';
  }
  return 'Не удалось загрузить гостевые заявки. Попробуйте ещё раз.';
}

function requestStatusClass(status: OwnerGuestRequestStatus) {
  if (status === 'waiting') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'completed') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function RequestStatus({ status }: { status: OwnerGuestRequestStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${requestStatusClass(status)}`}>
      {ownerGuestRequestStatusLabel(status)}
    </span>
  );
}

function OpenRequestButton({
  request,
  onOpen,
  compact = false,
}: {
  request: OwnerGuestRequest;
  onOpen: (request: OwnerGuestRequest, trigger: HTMLButtonElement) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(request, event.currentTarget)}
      className={`${compact ? 'w-full justify-center' : ''} inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
      aria-label={`Открыть гостевую заявку ${request.requestNumber}`}
    >
      Открыть
      <ExternalLink aria-hidden="true" size={14} />
    </button>
  );
}

function RequestMobileCard({
  request,
  timezone,
  onOpen,
}: {
  request: OwnerGuestRequest;
  timezone: string;
  onOpen: (request: OwnerGuestRequest, trigger: HTMLButtonElement) => void;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Номер заявки</p>
          <h4
            title={request.requestNumber}
            aria-label={`Номер заявки ${request.requestNumber}`}
            className="mt-1 max-w-full truncate whitespace-nowrap font-mono text-sm font-bold text-slate-950"
          >
            {request.requestNumber}
          </h4>
        </div>
        <RequestStatus status={request.status} />
      </div>

      <dl className="mt-4 grid gap-3 text-sm min-[390px]:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Арендатор</dt>
          <dd className="mt-1 font-semibold text-slate-950">{request.tenantShortName}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Гость</dt>
          <dd className="mt-1 break-words font-semibold text-slate-950">{request.guestName}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Автомобиль</dt>
          <dd
            title={request.vehicleNumber || 'Номер автомобиля не распознан'}
            className={`mt-1 break-words font-semibold text-slate-950 ${request.vehicleNumber ? 'font-mono' : ''}`}
          >
            {request.vehicleNumber || 'Номер автомобиля не распознан'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Тип</dt>
          <dd className="mt-1 font-semibold text-slate-950">{ownerGuestRequestTypeLabel(request.requestType)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Создана</dt>
          <dd className="mt-1 text-slate-800">{formatOwnerDateTime(request.createdAt, timezone)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Фактические проезды</dt>
          <dd className="mt-1 font-semibold text-slate-950">{formatOwnerInteger(request.passageCount)}</dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5">
        <div>
          <p className="text-xs text-slate-500">Общее время</p>
          <p className="mt-1 font-semibold text-slate-950">{formatOwnerDuration(request.totalDurationMinutes)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Начислено арендатору</p>
          <p className="mt-1 whitespace-nowrap font-bold text-blue-800">{formatOwnerMoney(request.totalAmount)}</p>
        </div>
      </div>

      <div className="mt-4">
        <OpenRequestButton request={request} onOpen={onOpen} compact />
      </div>
    </article>
  );
}

export default function OwnerGuestRequestsRegistry({
  periodMode,
  summary,
  tenants,
  onUnauthorized,
}: OwnerGuestRequestsRegistryProps) {
  const [response, setResponse] = useState<OwnerGuestRequestsResponse>(emptyResponse);
  const [page, setPage] = useState(1);
  const [tenantId, setTenantId] = useState('');
  const [requestType, setRequestType] = useState<OwnerGuestRequestType | ''>('');
  const [status, setStatus] = useState<OwnerGuestRequestStatus | ''>('');
  const [sort, setSort] = useState<OwnerGuestRequestSort>('createdAt');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorQueryKey, setErrorQueryKey] = useState('');
  const [responseQueryKey, setResponseQueryKey] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<OwnerGuestRequest | null>(null);
  const [selectedPeriodMode, setSelectedPeriodMode] = useState<OwnerPeriodMode | null>(null);
  const [drawerTrigger, setDrawerTrigger] = useState<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const closeDrawer = useCallback(() => {
    setSelectedRequest(null);
    setSelectedPeriodMode(null);
  }, []);

  const loadRequests = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    const queryKey = [periodMode, page, tenantId, requestType, status, sort, order].join('|');
    setLoading(true);
    setError('');
    setErrorQueryKey('');

    try {
      const params = new URLSearchParams({
        period: periodMode,
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
        order,
      });
      if (tenantId) params.set('tenantId', tenantId);
      if (requestType) params.set('requestType', requestType);
      if (status) params.set('status', status);

      const requestResponse = await fetch(`/api/demo/owner/guest-requests?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (requestResponse.status === 401) {
        throw new GuestRequestsError(401, 'UNAUTHORIZED', 'Demo-сессия завершилась.');
      }
      const payload = await readRequestsResponse(requestResponse);
      if (controller.signal.aborted || generation !== generationRef.current) return;
      setResponse(payload);
      setResponseQueryKey(queryKey);
    } catch (nextError) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      if (nextError instanceof GuestRequestsError && nextError.status === 401) {
        onUnauthorized();
        return;
      }
      setError(requestsErrorMessage(nextError));
      setErrorQueryKey(queryKey);
    } finally {
      if (!controller.signal.aborted && generation === generationRef.current) setLoading(false);
    }
  }, [onUnauthorized, order, page, periodMode, requestType, sort, status, tenantId]);

  useEffect(() => {
    abortRef.current?.abort();
    generationRef.current += 1;
    setPage(1);
    setResponse(emptyResponse);
    closeDrawer();
  }, [closeDrawer, periodMode]);

  useEffect(() => {
    if (tenantId && !tenants.some((tenant) => tenant.tenantId === tenantId)) {
      setTenantId('');
      setPage(1);
      closeDrawer();
    }
  }, [closeDrawer, tenantId, tenants]);

  useEffect(() => {
    void loadRequests();
    return () => abortRef.current?.abort();
  }, [loadRequests]);

  function resetPageAndDrawer() {
    setPage(1);
    closeDrawer();
  }

  function openRequest(request: OwnerGuestRequest, trigger: HTMLButtonElement) {
    setDrawerTrigger(trigger);
    setSelectedRequest(request);
    setSelectedPeriodMode(periodMode);
  }

  const currentQueryKey = [periodMode, page, tenantId, requestType, status, sort, order].join('|');
  const hasCurrentResponse = responseQueryKey === currentQueryKey;
  const currentError = errorQueryKey === currentQueryKey ? error : '';
  const currentLoading = loading || (!hasCurrentResponse && !currentError);
  const currentItems = hasCurrentResponse ? response.items : [];
  const currentTotal = hasCurrentResponse ? response.total : 0;
  const currentTotalPages = hasCurrentResponse ? response.totalPages : 0;
  const currentResponsePage = hasCurrentResponse ? response.page : page;
  const currentPageSize = hasCurrentResponse ? response.pageSize : PAGE_SIZE;
  const timezone = hasCurrentResponse && response.period.label
    ? response.period.timezone
    : summary?.period.timezone || 'Europe/Moscow';
  const periodLabel = (hasCurrentResponse ? response.period.label : '')
    || summary?.period.label
    || (periodMode === 'current' ? 'Текущий месяц' : 'Предыдущий месяц');
  const filtersActive = Boolean(tenantId || requestType || status);

  return (
    <>
      <div className="grid gap-5">
        <section aria-labelledby="guest-requests-summary-title">
          <h3 id="guest-requests-summary-title" className="sr-only">Показатели гостевых заявок</h3>
          <div className="grid gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Всего гостевых заявок</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{summary ? formatOwnerInteger(summary.guestRequestCount) : '—'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Гостевые проезды</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{summary ? formatOwnerInteger(summary.guestPassageCount) : '—'}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm min-[390px]:col-span-2 lg:col-span-1">
              <p className="text-sm text-blue-800">Начислено арендаторам за гостевые проезды</p>
              <p className="mt-2 whitespace-nowrap text-3xl font-bold text-blue-950">{summary ? formatOwnerMoney(summary.amounts.guestPassages) : '—'}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="guest-requests-registry-title" className="scroll-mt-[144px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:scroll-mt-[100px]">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><ClipboardList aria-hidden="true" size={20} /></span>
                  <div>
                    <h3 id="guest-requests-registry-title" className="font-bold text-slate-950">Гостевые заявки</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Найдено: {formatOwnerInteger(currentTotal)} · {periodLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[700px] xl:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Арендатор
                  <select
                    value={tenantId}
                    disabled={!tenants.length}
                    onChange={(event) => { setTenantId(event.target.value); resetPageAndDrawer(); }}
                    className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">Все арендаторы</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.tenantId} value={tenant.tenantId}>{tenant.shortName}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Тип заявки
                  <select
                    value={requestType}
                    onChange={(event) => { setRequestType(event.target.value as OwnerGuestRequestType | ''); resetPageAndDrawer(); }}
                    className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {requestTypeOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Статус
                  <select
                    value={status}
                    onChange={(event) => { setStatus(event.target.value as OwnerGuestRequestStatus | ''); resetPageAndDrawer(); }}
                    className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {requestStatusOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-1 xl:col-span-2">
                  Сортировка
                  <select
                    value={sort}
                    onChange={(event) => { setSort(event.target.value as OwnerGuestRequestSort); resetPageAndDrawer(); }}
                    className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                  Порядок
                  <select
                    value={order}
                    onChange={(event) => { setOrder(event.target.value as SortOrder); resetPageAndDrawer(); }}
                    className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="desc">По убыванию</option>
                    <option value="asc">По возрастанию</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {currentLoading ? 'Загружаем гостевые заявки' : currentError ? 'Не удалось загрузить гостевые заявки' : `Загружено ${currentItems.length} из ${currentTotal}, страница ${currentResponsePage}`}
          </p>
          <div aria-busy={currentLoading} className="min-h-56">
            {currentLoading ? (
              <div role="status" aria-label="Загружаем гостевые заявки" className="grid gap-3 p-5 sm:p-6">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} aria-hidden="true" className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : currentError ? (
              <div role="alert" className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950 sm:m-6">
                <p className="font-bold">Не удалось загрузить гостевые заявки</p>
                <p className="mt-1 text-sm leading-6">{currentError}</p>
                <button
                  type="button"
                  onClick={() => void loadRequests()}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
                >
                  <RefreshCw aria-hidden="true" size={17} />
                  Повторить загрузку
                </button>
              </div>
            ) : currentItems.length ? (
              <>
                <div className="grid gap-3 p-4 lg:hidden">
                  {currentItems.map((request) => (
                    <RequestMobileCard key={request.id} request={request} timezone={timezone} onOpen={openRequest} />
                  ))}
                </div>

                <OwnerScrollableTable label="Гостевые заявки, прокручиваемая таблица">
                  <table className="w-full min-w-[980px] border-collapse text-left text-xs">
                    <caption className="sr-only">Гостевые заявки за период {periodLabel}</caption>
                    <thead className="bg-slate-950 text-white">
                      <tr>
                        <th scope="col" className="px-3 py-3 font-semibold">Номер заявки</th>
                        <th scope="col" className="px-3 py-3 font-semibold">Арендатор</th>
                        <th scope="col" className="px-3 py-3 font-semibold">Гость</th>
                        <th scope="col" className="px-3 py-3 font-semibold">Автомобиль</th>
                        <th scope="col" className="px-3 py-3 font-semibold">Статус</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold">Проезды</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold">Начислено арендатору, ₽</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentItems.map((request) => (
                        <tr key={request.id} className="align-top transition hover:bg-blue-50/50">
                          <th scope="row" title={request.requestNumber} className="whitespace-nowrap px-3 py-4 font-mono font-bold text-slate-950">{request.requestNumber}</th>
                          <td className="px-3 py-4 font-semibold text-slate-900">{request.tenantShortName}</td>
                          <td className="max-w-48 break-words px-3 py-4 text-slate-800">{request.guestName}</td>
                          <td title={request.vehicleNumber || 'Номер автомобиля не распознан'} className={`px-3 py-4 font-semibold text-slate-800 ${request.vehicleNumber ? 'whitespace-nowrap font-mono' : ''}`}>{request.vehicleNumber || 'Номер автомобиля не распознан'}</td>
                          <td className="px-3 py-4"><RequestStatus status={request.status} /></td>
                          <td className="px-3 py-4 text-right font-semibold text-slate-900">{formatOwnerInteger(request.passageCount)}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-right font-bold text-blue-800">{formatOwnerMoney(request.totalAmount)}</td>
                          <td className="px-3 py-4 text-right"><OpenRequestButton request={request} onOpen={openRequest} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </OwnerScrollableTable>
              </>
            ) : (
              <div className="p-5 sm:p-6">
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                  <SearchX aria-hidden="true" size={28} className="mx-auto text-slate-400" />
                  <p className="mt-3 font-bold text-slate-950">
                    {filtersActive
                      ? 'По выбранным фильтрам гостевые заявки не найдены'
                      : periodMode === 'current'
                        ? 'В текущей demo-сессии пока нет гостевых заявок'
                        : 'За выбранный период гостевые заявки не найдены'}
                  </p>
                  <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-600">
                    {filtersActive
                      ? 'Измените параметры фильтра или сбросьте их значения.'
                      : 'Заявка появится здесь после её создания в кабинете арендатора.'}
                  </p>
                  {periodMode === 'current' && !filtersActive ? (
                    <Link
                      href="/demo/gostevaya-zayavka"
                      className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      <CalendarRange aria-hidden="true" size={17} />
                      Создать гостевую заявку
                    </Link>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <OwnerRegistryPager
            page={currentResponsePage}
            pageSize={currentPageSize}
            total={currentTotal}
            totalPages={currentTotalPages}
            loading={currentLoading}
            label="гостевые заявки"
            onPageChange={(nextPage) => { setPage(nextPage); closeDrawer(); }}
          />
        </section>
      </div>

      <OwnerGuestRequestDrawer
        request={selectedPeriodMode === periodMode ? selectedRequest : null}
        periodMode={periodMode}
        timezone={timezone}
        returnFocusTo={drawerTrigger}
        onClose={closeDrawer}
        onUnauthorized={onUnauthorized}
      />
    </>
  );
}
