'use client';

import { Building2, ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react';
import {
  formatOwnerInteger,
  formatOwnerMoney,
  ownerObjectTypeLabel,
} from './owner-formatters';
import type {
  OwnerObjectType,
  OwnerPeriod,
  OwnerTenant,
  OwnerTenantSort,
  SortOrder,
} from './owner-types';

const objectTypeOptions: Array<{ value: OwnerObjectType | ''; label: string }> = [
  { value: '', label: 'Все типы' },
  { value: 'office', label: 'Офис' },
  { value: 'warehouse', label: 'Склад' },
  { value: 'retail', label: 'Торговля' },
  { value: 'service', label: 'Сервис' },
  { value: 'entertainment', label: 'Развлечения' },
  { value: 'logistics', label: 'Логистика' },
];

const sortOptions: Array<{ value: OwnerTenantSort; label: string }> = [
  { value: 'totalAmount', label: 'По общей сумме' },
  { value: 'shortName', label: 'По названию' },
  { value: 'operationCount', label: 'По количеству операций' },
  { value: 'guestRequestCount', label: 'По гостевым заявкам' },
  { value: 'webDiscountCount', label: 'По числу оплаченных парковок' },
];

export type OwnerTenantTableProps = {
  items: OwnerTenant[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  period: OwnerPeriod | null;
  objectType: OwnerObjectType | '';
  sort: OwnerTenantSort;
  order: SortOrder;
  loading: boolean;
  error?: string | null;
  onObjectTypeChange: (value: OwnerObjectType | '') => void;
  onSortChange: (value: OwnerTenantSort) => void;
  onOrderChange: (value: SortOrder) => void;
  onPageChange: (page: number) => void;
  onOpenTenant: (tenantId: string, trigger: HTMLButtonElement) => void;
  onRetry?: () => void;
};

function TenantOpenButton({
  tenant,
  onOpenTenant,
  compact = false,
}: {
  tenant: OwnerTenant;
  onOpenTenant: OwnerTenantTableProps['onOpenTenant'];
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      data-owner-tenant-trigger
      onClick={(event) => {
        event.stopPropagation();
        onOpenTenant(tenant.tenantId, event.currentTarget);
      }}
      className={`${compact ? 'w-full justify-center sm:w-auto' : 'mt-2'} inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
      aria-label={`Открыть арендатора ${tenant.shortName}`}
    >
      Открыть арендатора
      <ExternalLink aria-hidden="true" size={14} />
    </button>
  );
}

function TenantMobileCard({
  tenant,
  onOpenTenant,
}: {
  tenant: OwnerTenant;
  onOpenTenant: OwnerTenantTableProps['onOpenTenant'];
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-950">{tenant.shortName}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">{tenant.legalName}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {ownerObjectTypeLabel(tenant.objectType)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-slate-500">ИНН</dt>
          <dd className="mt-0.5 font-mono font-semibold text-slate-800">{tenant.inn}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Гостевые заявки</dt>
          <dd className="mt-0.5 font-semibold text-slate-950">{formatOwnerInteger(tenant.guestRequestCount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Гостевые проезды</dt>
          <dd className="mt-0.5 font-semibold text-slate-950">{formatOwnerInteger(tenant.guestPassageCount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Оплачено парковок</dt>
          <dd className="mt-0.5 font-semibold text-slate-950">{formatOwnerInteger(tenant.webDiscountCount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Легковые, ₽</dt>
          <dd className="mt-0.5 font-semibold text-slate-950">{formatOwnerMoney(tenant.carAmount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Грузовые, ₽</dt>
          <dd className="mt-0.5 font-semibold text-slate-950">{formatOwnerMoney(tenant.truckAmount)}</dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Итого</p>
          <p className="mt-1 text-[1.4rem] font-bold text-blue-800">{formatOwnerMoney(tenant.totalAmount)}</p>
        </div>
        <TenantOpenButton tenant={tenant} onOpenTenant={onOpenTenant} compact />
      </div>
    </article>
  );
}

export default function OwnerTenantTable({
  items,
  total,
  page,
  pageSize,
  totalPages,
  period,
  objectType,
  sort,
  order,
  loading,
  error,
  onObjectTypeChange,
  onSortChange,
  onOrderChange,
  onPageChange,
  onOpenTenant,
  onRetry,
}: OwnerTenantTableProps) {
  const firstItem = total ? (page - 1) * pageSize + 1 : 0;
  const lastItem = total ? Math.min(page * pageSize, total) : 0;

  function openFromRow(tenant: OwnerTenant, row: HTMLTableRowElement) {
    const trigger = row.querySelector<HTMLButtonElement>('button[data-owner-tenant-trigger]');
    if (trigger) onOpenTenant(tenant.tenantId, trigger);
  }

  return (
    <section aria-labelledby="owner-tenants-title" className="scroll-mt-32 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Building2 aria-hidden="true" size={20} /></span>
              <div>
                <h3 id="owner-tenants-title" className="font-bold text-slate-950">Арендаторы</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Найдено: {formatOwnerInteger(total)} · {period?.label ?? 'Выбранный период'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Тип объекта
              <select
                value={objectType}
                onChange={(event) => onObjectTypeChange(event.target.value as OwnerObjectType | '')}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {objectTypeOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Сортировка
              <select
                value={sort}
                onChange={(event) => onSortChange(event.target.value as OwnerTenantSort)}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Порядок
              <select
                value={order}
                onChange={(event) => onOrderChange(event.target.value as SortOrder)}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="desc">По убыванию</option>
                <option value="asc">По возрастанию</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div aria-live="polite" aria-busy={loading} className="relative min-h-48">
        {loading ? (
          <div role="status" className="grid gap-3 p-5 sm:p-6" aria-label="Загружаем арендаторов">
            {Array.from({ length: 5 }, (_, index) => <div key={index} aria-hidden="true" className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : error ? (
          <div role="alert" className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950 sm:m-6">
            <p className="font-bold">Не удалось загрузить арендаторов</p>
            <p className="mt-1 text-sm leading-6">{error}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
              >
                <RefreshCw aria-hidden="true" size={17} />
                Повторить загрузку
              </button>
            ) : null}
          </div>
        ) : items.length ? (
          <>
            <div className="grid gap-3 p-4 lg:hidden">
              {items.map((tenant) => <TenantMobileCard key={tenant.tenantId} tenant={tenant} onOpenTenant={onOpenTenant} />)}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[880px] table-fixed border-collapse text-left text-[12px]">
                <caption className="sr-only">Арендаторы и начисления за период {period?.label ?? ''}</caption>
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th scope="col" className="w-[20%] px-3 py-3 font-semibold">Арендатор</th>
                    <th scope="col" className="w-[11%] px-2 py-3 font-semibold">ИНН</th>
                    <th scope="col" className="w-[10%] px-2 py-3 font-semibold">Тип объекта</th>
                    <th scope="col" className="w-[7%] px-2 py-3 text-right font-semibold">Гостевые заявки</th>
                    <th scope="col" className="w-[10%] px-2 py-3 text-right font-semibold">Гостевые проезды</th>
                    <th scope="col" className="w-[10%] px-2 py-3 text-right font-semibold">Оплачено парковок</th>
                    <th scope="col" className="w-[10%] px-2 py-3 text-right font-semibold">Легковые, ₽</th>
                    <th scope="col" className="w-[10%] px-2 py-3 text-right font-semibold">Грузовые, ₽</th>
                    <th scope="col" className="w-[12%] px-3 py-3 text-right font-semibold">Итого, ₽</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((tenant) => (
                    <tr
                      key={tenant.tenantId}
                      onClick={(event) => openFromRow(tenant, event.currentTarget)}
                      className="cursor-pointer align-top transition hover:bg-blue-50/60"
                    >
                      <th scope="row" className="px-3 py-4 font-normal">
                        <p className="font-bold text-slate-950">{tenant.shortName}</p>
                        <p className="mt-1 line-clamp-2 leading-5 text-slate-500">{tenant.legalName}</p>
                        <TenantOpenButton tenant={tenant} onOpenTenant={onOpenTenant} />
                      </th>
                      <td className="whitespace-nowrap px-2 py-4 font-mono font-semibold text-slate-700">{tenant.inn}</td>
                      <td className="px-2 py-4 text-slate-700">{ownerObjectTypeLabel(tenant.objectType)}</td>
                      <td className="px-2 py-4 text-right font-semibold text-slate-800">{formatOwnerInteger(tenant.guestRequestCount)}</td>
                      <td className="px-2 py-4 text-right font-semibold text-slate-800">{formatOwnerInteger(tenant.guestPassageCount)}</td>
                      <td className="px-2 py-4 text-right font-semibold text-slate-800">{formatOwnerInteger(tenant.webDiscountCount)}</td>
                      <td className="whitespace-nowrap px-2 py-4 text-right font-semibold text-slate-800">{formatOwnerMoney(tenant.carAmount)}</td>
                      <td className="whitespace-nowrap px-2 py-4 text-right font-semibold text-slate-800">{formatOwnerMoney(tenant.truckAmount)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-right font-bold text-blue-800">{formatOwnerMoney(tenant.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-5 sm:p-6">
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
              <Building2 aria-hidden="true" size={28} className="mx-auto text-slate-400" />
              <p className="mt-3 font-bold text-slate-950">Арендаторы не найдены</p>
              <p className="mt-1 text-sm text-slate-600">Измените тип объекта или выберите другой отчётный период.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-slate-600">
          {total ? `${formatOwnerInteger(firstItem)}–${formatOwnerInteger(lastItem)} из ${formatOwnerInteger(total)}` : 'Нет записей'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={loading || page <= 1 || totalPages === 0}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Предыдущая страница арендаторов"
          >
            <ChevronLeft aria-hidden="true" size={17} />
            Назад
          </button>
          <span className="min-w-24 text-center font-semibold text-slate-700" aria-live="polite">
            {totalPages ? `${page} из ${totalPages}` : '0 страниц'}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={loading || totalPages === 0 || page >= totalPages}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Следующая страница арендаторов"
          >
            Вперёд
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
