'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BadgePercent, CarFront, ClipboardCheck, ExternalLink, FilterX, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import OwnerOperationDrawer from './OwnerOperationDrawer';
import OwnerRegistryPager from './OwnerRegistryPager';
import OwnerScrollableTable from './OwnerScrollableTable';
import {
  formatOwnerDateTime,
  formatOwnerDuration,
  formatOwnerInteger,
  formatOwnerMoney,
  ownerOperationStatusLabel,
  ownerOperationTypeLabel,
  ownerVehicleTypeLabel,
} from './owner-formatters';
import type {
  OwnerOperation,
  OwnerOperationSort,
  OwnerOperationStatus,
  OwnerOperationType,
  OwnerOperationsResponse,
  OwnerPeriodMode,
  OwnerSummary,
  OwnerTenant,
  OwnerVehicleType,
  SortOrder,
} from './owner-types';

type OwnerOperationsRegistryProps = {
  periodMode: OwnerPeriodMode;
  summary: OwnerSummary | null;
  tenants: OwnerTenant[];
  initialOperationType?: OwnerOperationType | '';
  initialSearch?: string;
  initialTenantId?: string;
  onUnauthorized: () => void;
  onOpenPayments: (tenantId?: string) => void;
};

const emptyResponse: OwnerOperationsResponse = {
  period: { from: '', toExclusive: '', timezone: 'Europe/Moscow', label: '' },
  items: [], page: 1, pageSize: 10, total: 0, totalPages: 0,
};

const sortOptions: Array<{ value: OwnerOperationSort; label: string }> = [
  { value: 'enteredAt', label: 'По времени въезда' },
  { value: 'exitedAt', label: 'По времени выезда' },
  { value: 'amount', label: 'По сумме' },
  { value: 'durationMinutes', label: 'По длительности' },
  { value: 'tenantShortName', label: 'По арендатору' },
  { value: 'basisNumber', label: 'По номеру основания' },
];

function apiErrorMessage(code?: string) {
  if (code === 'INVALID_QUERY') return 'Проверьте выбранные фильтры и повторите запрос.';
  return 'Не удалось загрузить журнал операций. Попробуйте ещё раз.';
}

function Metrics({ summary }: { summary: OwnerSummary | null }) {
  const metrics = [
    ['Завершённые операции', summary ? formatOwnerInteger(summary.completedOperationCount) : '—'],
    ['Начислено арендаторам', summary ? formatOwnerMoney(summary.amounts.totalTenantCharges) : '—'],
    ['Гостевые проезды', summary ? formatOwnerInteger(summary.guestPassageCount) : '—'],
    ['Оплачено парковок', summary ? formatOwnerInteger(summary.webDiscountCount) : '—'],
  ];
  return (
    <dl className="grid gap-3 min-[390px]:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <dt className="text-xs leading-5 text-slate-500">{label}</dt>
          <dd className="mt-2 whitespace-nowrap text-xl font-bold text-slate-950">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function OperationCard({ operation, timezone, onOpen }: { operation: OwnerOperation; timezone: string; onOpen: (operation: OwnerOperation, trigger: HTMLButtonElement) => void }) {
  const TypeIcon = operation.operationType === 'web_discount' ? BadgePercent : ClipboardCheck;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
          <TypeIcon aria-hidden="true" size={14} /> {ownerOperationTypeLabel(operation.operationType)}
        </span>
        <span className="text-xs font-semibold text-slate-600">{ownerOperationStatusLabel(operation.status)}</span>
      </div>
      <p className="mt-3 font-bold text-slate-950">{operation.tenantShortName}</p>
      <p className="mt-1 min-w-0 text-sm font-semibold text-blue-800">
        <span>{operation.operationType === 'web_discount' ? 'Талон' : 'Заявка'} </span>
        <span
          title={operation.basisNumber}
          aria-label={`${operation.operationType === 'web_discount' ? 'Номер талона' : 'Номер заявки'} ${operation.basisNumber}`}
          className="inline-block max-w-full truncate whitespace-nowrap align-bottom font-mono"
        >
          {operation.basisNumber}
        </span>
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-slate-500">Автомобиль</dt><dd title={operation.vehicleNumber || 'Номер не распознан'} className={`mt-1 font-semibold text-slate-900 ${operation.vehicleNumber ? 'font-mono' : ''}`}>{operation.vehicleNumber || 'Номер не распознан'}</dd></div>
        <div><dt className="text-xs text-slate-500">Длительность</dt><dd className="mt-1 font-semibold text-slate-900">{formatOwnerDuration(operation.durationMinutes)}</dd></div>
        <div><dt className="text-xs text-slate-500">Въезд</dt><dd className="mt-1 text-slate-900">{formatOwnerDateTime(operation.enteredAt, timezone)}</dd></div>
        <div><dt className="text-xs text-slate-500">Сумма</dt><dd className="mt-1 whitespace-nowrap font-bold text-blue-800">{formatOwnerMoney(operation.amount)}</dd></div>
      </dl>
      <button
        type="button"
        onClick={(event) => onOpen(operation, event.currentTarget)}
        aria-label={`Открыть ${ownerOperationTypeLabel(operation.operationType).toLowerCase()} ${operation.basisNumber}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Открыть <ExternalLink aria-hidden="true" size={16} />
      </button>
    </article>
  );
}

export default function OwnerOperationsRegistry({
  periodMode,
  summary,
  tenants,
  initialOperationType = '',
  initialSearch = '',
  initialTenantId = '',
  onUnauthorized,
  onOpenPayments,
}: OwnerOperationsRegistryProps) {
  const [data, setData] = useState<OwnerOperationsResponse>(emptyResponse);
  const [page, setPage] = useState(1);
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [operationType, setOperationType] = useState<OwnerOperationType | ''>(initialOperationType);
  const [vehicleType, setVehicleType] = useState<OwnerVehicleType | ''>('');
  const [status, setStatus] = useState<OwnerOperationStatus | ''>('');
  const [sort, setSort] = useState<OwnerOperationSort>('enteredAt');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch.trim());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadedQuery, setLoadedQuery] = useState('');
  const [errorQuery, setErrorQuery] = useState('');
  const [selected, setSelected] = useState<OwnerOperation | null>(null);
  const [drawerTrigger, setDrawerTrigger] = useState<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const closeDrawer = useCallback(() => {
    setSelected(null);
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      period: periodMode,
      page: String(page),
      pageSize: '10',
      sort,
      order,
    });
    if (tenantId) params.set('tenantId', tenantId);
    if (operationType) params.set('operationType', operationType);
    if (vehicleType) params.set('vehicleType', vehicleType);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    return params.toString();
  }, [operationType, order, page, periodMode, search, sort, status, tenantId, vehicleType]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    setLoading(true);
    setError('');
    setErrorQuery('');
    try {
      const response = await fetch(`/api/demo/owner/operations?${query}`, { cache: 'no-store', signal: controller.signal });
      const payload = await response.json().catch(() => null) as (OwnerOperationsResponse & { code?: string }) | null;
      if (controller.signal.aborted || generation !== generationRef.current) return;
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok || !payload) throw new Error(apiErrorMessage(payload?.code));
      setData(payload);
      setLoadedQuery(query);
    } catch (loadError) {
      if (controller.signal.aborted) return;
      setError(loadError instanceof Error ? loadError.message : apiErrorMessage());
      setErrorQuery(query);
    } finally {
      if (!controller.signal.aborted && generation === generationRef.current) setLoading(false);
    }
  }, [onUnauthorized, query]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    setPage(1);
    setSelected(null);
    setData(emptyResponse);
    setLoadedQuery('');
    setErrorQuery('');
  }, [periodMode]);

  function resetForFilter(action: () => void) {
    action();
    setPage(1);
    closeDrawer();
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetForFilter(() => setSearch(searchInput.trim()));
  }

  function clearFilters() {
    setTenantId('');
    setOperationType('');
    setVehicleType('');
    setStatus('');
    setSort('enteredAt');
    setOrder('desc');
    setSearchInput('');
    setSearch('');
    setPage(1);
    closeDrawer();
  }

  const queryIsCurrent = loadedQuery === query;
  const visibleData = queryIsCurrent ? data : emptyResponse;
  const visibleError = errorQuery === query ? error : '';
  const visibleLoading = loading || (!queryIsCurrent && !visibleError);
  const timezone = visibleData.period.timezone || summary?.period.timezone || 'Europe/Moscow';
  const currentEmpty = periodMode === 'current' && !visibleLoading && !visibleError && visibleData.total === 0
    && !tenantId && !operationType && !vehicleType && !status && !search;

  return (
    <div className="grid gap-5">
      <Metrics summary={summary} />
      <section aria-labelledby="owner-operations-title" className="scroll-mt-[144px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:scroll-mt-[100px]">
        <header className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Единый журнал</p>
              <h3 id="owner-operations-title" className="mt-1 text-xl font-bold text-slate-950">Все операции</h3>
              <p className="mt-1 text-sm text-slate-500">Фактические гостевые проезды и оплаты парковки за выбранный период.</p>
            </div>

            <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Поиск по журналу операций</span>
                <Search aria-hidden="true" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    resetForFilter(() => setSearch(searchInput.trim()));
                  }}
                  placeholder="Заявка, талон, автомобиль или арендатор"
                  maxLength={100}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </label>
              <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <Search aria-hidden="true" size={17} /> Найти
              </button>
              <button type="button" onClick={clearFilters} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <FilterX aria-hidden="true" size={17} /> Очистить фильтры
              </button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Арендатор
                <select value={tenantId} onChange={(event) => resetForFilter(() => setTenantId(event.target.value))} disabled={!tenants.length} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 disabled:bg-slate-100">
                  <option value="">Все арендаторы</option>
                  {tenants.map((tenant) => <option key={tenant.tenantId} value={tenant.tenantId}>{tenant.shortName}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Тип операции
                <select value={operationType} onChange={(event) => resetForFilter(() => setOperationType(event.target.value as OwnerOperationType | ''))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950">
                  <option value="">Все операции</option><option value="guest_passage">Гостевой проезд</option><option value="web_discount">Оплата парковки гостя</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Транспорт
                <select value={vehicleType} onChange={(event) => resetForFilter(() => setVehicleType(event.target.value as OwnerVehicleType | ''))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950">
                  <option value="">Все типы</option><option value="car">Легковой</option><option value="truck">Грузовой</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Статус
                <select value={status} onChange={(event) => resetForFilter(() => setStatus(event.target.value as OwnerOperationStatus | ''))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950">
                  <option value="">Все статусы</option><option value="active">На территории</option><option value="completed">Завершено</option><option value="cancelled">Отменено</option><option value="applied">Оплачено арендатором</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Сортировка
                <select value={sort} onChange={(event) => resetForFilter(() => setSort(event.target.value as OwnerOperationSort))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950">
                  {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Порядок
                <select value={order} onChange={(event) => resetForFilter(() => setOrder(event.target.value as SortOrder))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950">
                  <option value="desc">По убыванию</option><option value="asc">По возрастанию</option>
                </select>
              </label>
            </div>
          </div>
        </header>

        <p className="sr-only" aria-live="polite">
          {visibleLoading ? 'Загружаем операции' : visibleError ? 'Не удалось загрузить операции' : `Загружено ${visibleData.items.length} из ${visibleData.total}, страница ${visibleData.page || page}`}
        </p>
        <div aria-busy={visibleLoading} className="min-h-64">
          {visibleLoading ? (
            <div role="status" className="grid gap-3 p-5 sm:p-6" aria-label="Загружаем операции">
              {Array.from({ length: 6 }, (_, index) => <div key={index} aria-hidden="true" className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : visibleError ? (
            <div role="alert" className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950 sm:m-6">
              <p className="font-bold">Не удалось загрузить операции</p><p className="mt-1 text-sm">{visibleError}</p>
              <button type="button" onClick={() => void load()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white"><RefreshCw aria-hidden="true" size={17} />Повторить загрузку</button>
            </div>
          ) : visibleData.items.length ? (
            <>
              <div className="grid gap-3 p-4 lg:hidden">
                {visibleData.items.map((operation) => <OperationCard key={operation.id} operation={operation} timezone={timezone} onOpen={(item, trigger) => { setDrawerTrigger(trigger); setSelected(item); }} />)}
              </div>
              <OwnerScrollableTable label="Все операции, прокручиваемая таблица">
                <table className="w-full min-w-[1040px] border-collapse text-left text-xs">
                  <caption className="sr-only">Все операции владельца парковки</caption>
                  <thead className="bg-slate-950 text-white"><tr>
                    {['Тип операции', 'Арендатор', 'Основание', 'Автомобиль', 'Въезд', 'Сумма, ₽', 'Статус', 'Действие'].map((label) => <th key={label} scope="col" className={`${['Сумма, ₽'].includes(label) ? 'text-right' : ''} px-3 py-3 font-semibold`}>{label}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleData.items.map((operation) => (
                      <tr key={operation.id} className="align-top hover:bg-blue-50/50">
                        <td className="px-3 py-4 font-semibold">{ownerOperationTypeLabel(operation.operationType)}</td>
                        <td className="max-w-48 px-3 py-4 font-semibold"><span className="line-clamp-2">{operation.tenantShortName}</span></td>
                        <td className="px-3 py-4"><span className="block text-[10px] uppercase text-slate-500">{operation.operationType === 'web_discount' ? 'Талон' : 'Заявка'}</span><span title={operation.basisNumber} className="whitespace-nowrap font-mono font-semibold">{operation.basisNumber}</span></td>
                        <td title={operation.vehicleNumber || 'Не распознан'} className={`whitespace-nowrap px-3 py-4 font-semibold ${operation.vehicleNumber ? 'font-mono' : ''}`}>{operation.vehicleNumber || 'Не распознан'}</td>
                        <td className="whitespace-nowrap px-3 py-4">{formatOwnerDateTime(operation.enteredAt, timezone)}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-right font-bold text-blue-800">{formatOwnerMoney(operation.amount)}</td>
                        <td className="px-3 py-4 font-semibold">{ownerOperationStatusLabel(operation.status)}</td>
                        <td className="px-3 py-4"><button type="button" aria-label={`Открыть ${ownerOperationTypeLabel(operation.operationType).toLowerCase()} ${operation.basisNumber}`} onClick={(event) => { setDrawerTrigger(event.currentTarget); setSelected(operation); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Открыть <ExternalLink aria-hidden="true" size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </OwnerScrollableTable>
            </>
          ) : (
            <div className="p-5 sm:p-6"><div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <ClipboardCheck aria-hidden="true" size={30} className="mx-auto text-slate-400" />
              <p className="mt-3 font-bold text-slate-950">{currentEmpty ? 'В текущей demo-сессии пока нет завершённых операций' : 'По выбранным фильтрам операции не найдены'}</p>
              <p className="mt-1 text-sm text-slate-600">Гостевая заявка появится здесь только после фактического проезда.</p>
              {currentEmpty ? <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><Link href="/demo/gostevaya-zayavka" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Создать гостевую заявку</Link><Link href="/demo/web-skidki" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900">Оплатить парковку гостя</Link></div> : null}
            </div></div>
          )}
        </div>
        <OwnerRegistryPager page={visibleData.page || page} pageSize={visibleData.pageSize || 10} total={visibleData.total} totalPages={visibleData.totalPages} loading={visibleLoading} label="операции" onPageChange={(next) => { setPage(next); closeDrawer(); }} />
      </section>

      <OwnerOperationDrawer
        operation={selected}
        timezone={timezone}
        returnFocusTo={drawerTrigger}
        onClose={closeDrawer}
        onOpenPayments={(nextTenantId) => { closeDrawer(); onOpenPayments(nextTenantId); }}
      />
    </div>
  );
}
