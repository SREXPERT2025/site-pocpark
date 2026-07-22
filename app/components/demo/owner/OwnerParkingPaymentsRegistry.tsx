'use client';

import Link from 'next/link';
import { BadgePercent, CarFront, ExternalLink, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OwnerParkingPaymentDrawer from './OwnerParkingPaymentDrawer';
import OwnerRegistryPager from './OwnerRegistryPager';
import OwnerScrollableTable from './OwnerScrollableTable';
import {
  formatOwnerDateTime,
  formatOwnerDuration,
  formatOwnerInteger,
  formatOwnerMoney,
  ownerOperationStatusLabel,
  ownerVehicleTypeLabel,
} from './owner-formatters';
import type {
  OwnerApiError,
  OwnerPeriodMode,
  OwnerSummary,
  OwnerTenant,
  OwnerVehicleType,
  OwnerWebDiscount,
  OwnerWebDiscountSort,
  OwnerWebDiscountsResponse,
  SortOrder,
} from './owner-types';

const PAGE_SIZE = 10;

const sortOptions: Array<{ value: OwnerWebDiscountSort; label: string }> = [
  { value: 'appliedAt', label: 'По дате операции' },
  { value: 'ticketNumber', label: 'По номеру талона' },
  { value: 'tenantShortName', label: 'По арендатору' },
  { value: 'originalCost', label: 'По исходной стоимости' },
  { value: 'durationMinutes', label: 'По длительности' },
];

type OwnerParkingPaymentsRegistryProps = {
  periodMode: OwnerPeriodMode;
  summary: OwnerSummary | null;
  tenants: OwnerTenant[];
  initialTenantId?: string;
  onUnauthorized: () => void;
};

type RegistryData = Pick<OwnerWebDiscountsResponse, 'items' | 'page' | 'pageSize' | 'total' | 'totalPages'>;

const emptyData: RegistryData = {
  items: [],
  page: 1,
  pageSize: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

function paymentErrorMessage(payload: OwnerApiError | null) {
  if (payload?.code === 'INVALID_QUERY') return 'Проверьте выбранные фильтры и попробуйте снова.';
  return payload?.error || 'Не удалось загрузить оплаты парковки. Попробуйте ещё раз.';
}

function OpenPaymentButton({
  payment,
  onOpen,
}: {
  payment: OwnerWebDiscount;
  onOpen: (payment: OwnerWebDiscount, trigger: HTMLButtonElement) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(payment, event.currentTarget)}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      aria-label={`Открыть оплату парковки по талону ${payment.ticketNumber}`}
    >
      Открыть <ExternalLink aria-hidden="true" size={15} />
    </button>
  );
}

function PaymentMobileCard({
  payment,
  timezone,
  onOpen,
}: {
  payment: OwnerWebDiscount;
  timezone: string;
  onOpen: (payment: OwnerWebDiscount, trigger: HTMLButtonElement) => void;
}) {
  return (
    <article className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Талон</p>
          <h4
            title={payment.ticketNumber}
            aria-label={`Номер талона ${payment.ticketNumber}`}
            className="mt-1 max-w-full truncate whitespace-nowrap font-mono text-[1.05rem] font-bold text-slate-950"
          >
            {payment.ticketNumber}
          </h4>
        </div>
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold leading-5 text-emerald-800">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
          {ownerOperationStatusLabel(payment.status)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="col-span-2">
          <dt className="text-xs text-slate-500">Дата операции</dt>
          <dd className="mt-0.5 font-semibold text-slate-950">{formatOwnerDateTime(payment.appliedAt, timezone)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Арендатор</dt>
          <dd className="mt-0.5 break-words font-semibold text-slate-950">{payment.tenantShortName}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Тип транспорта</dt>
          <dd className="mt-0.5 font-semibold text-slate-950">{ownerVehicleTypeLabel(payment.vehicleType)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Автомобиль</dt>
          <dd title={payment.vehicleNumber || 'Номер автомобиля не распознан'} className={`mt-0.5 break-words font-semibold text-slate-950 ${payment.vehicleNumber ? 'font-mono' : ''}`}>{payment.vehicleNumber || 'Номер автомобиля не распознан'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Длительность</dt>
          <dd className="mt-0.5 font-semibold text-slate-950">{formatOwnerDuration(payment.durationMinutes)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Исходная стоимость</dt>
          <dd className="mt-0.5 whitespace-nowrap font-semibold text-slate-950">{formatOwnerMoney(payment.originalCost)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Начислено арендатору</dt>
          <dd className="mt-0.5 whitespace-nowrap font-bold text-blue-800">{formatOwnerMoney(payment.tenantCharge)}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <OpenPaymentButton payment={payment} onOpen={onOpen} />
      </div>
    </article>
  );
}

export default function OwnerParkingPaymentsRegistry({
  periodMode,
  summary,
  tenants,
  initialTenantId,
  onUnauthorized,
}: OwnerParkingPaymentsRegistryProps) {
  const [tenantId, setTenantId] = useState(initialTenantId ?? '');
  const [vehicleType, setVehicleType] = useState<OwnerVehicleType | ''>('');
  const [sort, setSort] = useState<OwnerWebDiscountSort>('appliedAt');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RegistryData>(emptyData);
  const [loadedQuery, setLoadedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<OwnerWebDiscount | null>(null);
  const [drawerTrigger, setDrawerTrigger] = useState<HTMLElement | null>(null);
  const generationRef = useRef(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      period: periodMode,
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort,
      order,
    });
    if (tenantId) params.set('tenantId', tenantId);
    if (vehicleType) params.set('vehicleType', vehicleType);
    return params.toString();
  }, [order, page, periodMode, sort, tenantId, vehicleType]);

  const closeDrawer = useCallback(() => {
    setSelectedPayment(null);
    setDrawerTrigger(null);
  }, []);

  useEffect(() => {
    setPage(1);
    closeDrawer();
  }, [closeDrawer, periodMode]);

  useEffect(() => {
    setTenantId(initialTenantId ?? '');
    setPage(1);
    closeDrawer();
  }, [closeDrawer, initialTenantId]);

  useEffect(() => {
    const controller = new AbortController();
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setData(emptyData);
    setLoadedQuery('');
    setLoading(true);
    setError('');

    async function load() {
      try {
        const response = await fetch(`/api/demo/owner/web-discounts?${query}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null) as OwnerWebDiscountsResponse | OwnerApiError | null;
        if (controller.signal.aborted || generation !== generationRef.current) return;
        if (response.status === 401) {
          onUnauthorized();
          return;
        }
        if (!response.ok || !payload || !('items' in payload)) {
          throw new Error(paymentErrorMessage(payload as OwnerApiError | null));
        }
        setData({
          items: payload.items,
          page: payload.page,
          pageSize: payload.pageSize,
          total: payload.total,
          totalPages: payload.totalPages,
        });
        setLoadedQuery(query);
      } catch (requestError) {
        if (controller.signal.aborted || generation !== generationRef.current) return;
        setData(emptyData);
        setLoadedQuery(query);
        setError(requestError instanceof Error ? requestError.message : 'Не удалось загрузить оплаты парковки.');
      } finally {
        if (!controller.signal.aborted && generation === generationRef.current) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [onUnauthorized, query, reloadVersion]);

  function changeTenant(value: string) {
    setTenantId(value);
    setPage(1);
    closeDrawer();
  }

  function changeVehicleType(value: OwnerVehicleType | '') {
    setVehicleType(value);
    setPage(1);
    closeDrawer();
  }

  function changeSort(value: OwnerWebDiscountSort) {
    setSort(value);
    setPage(1);
    closeDrawer();
  }

  function changeOrder(value: SortOrder) {
    setOrder(value);
    setPage(1);
    closeDrawer();
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    closeDrawer();
  }

  function openPayment(payment: OwnerWebDiscount, trigger: HTMLButtonElement) {
    setSelectedPayment(payment);
    setDrawerTrigger(trigger);
  }

  const queryIsCurrent = loadedQuery === query;
  const visibleData = queryIsCurrent ? data : emptyData;
  const visiblyLoading = loading || !queryIsCurrent;
  const hasFilters = Boolean(tenantId || vehicleType);
  const timezone = summary?.period.timezone ?? 'Europe/Moscow';

  return (
    <div className="grid gap-6">
      <section aria-labelledby="owner-payment-metrics-title" className="grid gap-3 sm:grid-cols-2">
        <h2 id="owner-payment-metrics-title" className="sr-only">Показатели оплаты парковки гостей</h2>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Оплачено парковок</p>
              <p className="mt-2 text-[2rem] font-bold leading-none text-slate-950">{summary ? formatOwnerInteger(summary.webDiscountCount) : '—'}</p>
            </div>
            <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><BadgePercent aria-hidden="true" size={24} /></span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">Парковки гостей, оплаченные арендаторами за выбранный период.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-300">Начислено арендаторам</p>
              <p className="mt-2 whitespace-nowrap text-[2rem] font-bold leading-none">{summary ? formatOwnerMoney(summary.amounts.webDiscounts) : '—'}</p>
            </div>
            <span className="rounded-2xl bg-white/10 p-3 text-blue-300"><CarFront aria-hidden="true" size={24} /></span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">Исходная стоимость парковки, начисленная арендаторам.</p>
        </div>
      </section>

      <section aria-labelledby="owner-payments-title" className="scroll-mt-[144px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:scroll-mt-[100px]">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><BadgePercent aria-hidden="true" size={20} /></span>
              <div>
                <h2 id="owner-payments-title" className="font-bold text-slate-950">Оплата парковки гостей</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Детализация парковок, оплаченных за счёт арендаторов. Найдено: {formatOwnerInteger(visibleData.total)}.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Арендатор
                <select
                  value={tenantId}
                  onChange={(event) => changeTenant(event.target.value)}
                  disabled={!tenants.length}
                  className="min-h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Все арендаторы</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.tenantId} value={tenant.tenantId}>{tenant.shortName} — {tenant.legalName}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Тип транспорта
                <select
                  value={vehicleType}
                  onChange={(event) => changeVehicleType(event.target.value as OwnerVehicleType | '')}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="">Все типы</option>
                  <option value="car">Легковой</option>
                  <option value="truck">Грузовой</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Сортировка
                <select
                  value={sort}
                  onChange={(event) => changeSort(event.target.value as OwnerWebDiscountSort)}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Порядок
                <select
                  value={order}
                  onChange={(event) => changeOrder(event.target.value as SortOrder)}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <option value="desc">По убыванию</option>
                  <option value="asc">По возрастанию</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {visiblyLoading ? 'Загружаем оплаты парковки' : error ? 'Не удалось загрузить оплаты парковки' : `Загружено ${visibleData.items.length} из ${visibleData.total}, страница ${visibleData.page}`}
        </p>
        <div aria-busy={visiblyLoading} className="min-h-64">
          {visiblyLoading ? (
            <div role="status" className="grid gap-3 p-5 sm:p-6" aria-label="Загружаем оплаты парковки">
              {Array.from({ length: 5 }, (_, index) => <div key={index} aria-hidden="true" className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : error ? (
            <div role="alert" className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950 sm:m-6">
              <p className="font-bold">Не удалось загрузить оплаты парковки</p>
              <p className="mt-1 text-sm leading-6">{error}</p>
              <button
                type="button"
                onClick={() => setReloadVersion((value) => value + 1)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
              >
                <RefreshCw aria-hidden="true" size={17} /> Повторить загрузку
              </button>
            </div>
          ) : visibleData.items.length ? (
            <>
              <div className="grid gap-3 p-4 lg:hidden">
                {visibleData.items.map((payment) => (
                  <PaymentMobileCard key={payment.id} payment={payment} timezone={timezone} onOpen={openPayment} />
                ))}
              </div>

              <OwnerScrollableTable label="Оплата парковки гостей, прокручиваемая таблица">
                <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-[12px]">
                  <caption className="sr-only">Оплаты парковки гостей за выбранный период</caption>
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th scope="col" className="w-[12%] px-3 py-3 font-semibold">Дата операции</th>
                      <th scope="col" className="w-[11%] px-3 py-3 font-semibold">Талон</th>
                      <th scope="col" className="w-[14%] px-3 py-3 font-semibold">Арендатор</th>
                      <th scope="col" className="w-[11%] px-3 py-3 font-semibold">Автомобиль</th>
                      <th scope="col" className="w-[11%] px-3 py-3 text-right font-semibold">Исходная, ₽</th>
                      <th scope="col" className="w-[13%] px-3 py-3 text-right font-semibold">Начислено арендатору, ₽</th>
                      <th scope="col" className="w-[14%] px-3 py-3 font-semibold">Статус</th>
                      <th scope="col" className="w-[10%] px-3 py-3 text-right font-semibold">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleData.items.map((payment) => (
                      <tr key={payment.id} className="align-top transition hover:bg-blue-50/60">
                        <td className="px-3 py-4 font-medium text-slate-700">{formatOwnerDateTime(payment.appliedAt, timezone)}</td>
                        <th scope="row" title={payment.ticketNumber} className="whitespace-nowrap px-3 py-4 font-mono font-bold text-slate-950">{payment.ticketNumber}</th>
                        <td className="px-3 py-4 font-semibold text-slate-800">{payment.tenantShortName}</td>
                        <td title={payment.vehicleNumber || 'Номер автомобиля не распознан'} className={`break-words px-3 py-4 font-semibold text-slate-800 ${payment.vehicleNumber ? 'font-mono' : ''}`}>{payment.vehicleNumber || 'Номер автомобиля не распознан'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-right font-semibold text-slate-800">{formatOwnerMoney(payment.originalCost)}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-right font-bold text-blue-800">{formatOwnerMoney(payment.tenantCharge)}</td>
                        <td className="px-3 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
                            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
                            {ownerOperationStatusLabel(payment.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right"><OpenPaymentButton payment={payment} onOpen={openPayment} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </OwnerScrollableTable>
            </>
          ) : (
            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                <BadgePercent aria-hidden="true" size={30} className="mx-auto text-slate-400" />
                <p className="mt-3 font-bold text-slate-950">
                  {hasFilters
                    ? 'По выбранным фильтрам оплаты парковки не найдены'
                    : periodMode === 'current'
                      ? 'В текущей demo-сессии пока не оплачена парковка ни одного гостя'
                      : 'За выбранный период оплаты парковки не найдены'}
                </p>
                <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-600">
                  {hasFilters
                    ? 'Измените арендатора или тип транспорта.'
                    : periodMode === 'current'
                      ? 'Оплатите парковку гостя в рабочем demo-сценарии — операция появится в этом реестре.'
                      : 'Выберите другой отчётный период.'}
                </p>
                {periodMode === 'current' && !hasFilters ? (
                  <Link
                    href="/demo/web-skidki"
                    className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    <BadgePercent aria-hidden="true" size={18} /> Оплатить парковку гостя
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <OwnerRegistryPager
          page={visibleData.page}
          pageSize={visibleData.pageSize}
          total={visibleData.total}
          totalPages={visibleData.totalPages}
          loading={visiblyLoading}
          label="оплаты парковки гостей"
          onPageChange={changePage}
        />
      </section>

      <OwnerParkingPaymentDrawer
        payment={selectedPayment}
        returnFocusTo={drawerTrigger}
        timezone={timezone}
        onClose={closeDrawer}
      />
    </div>
  );
}
