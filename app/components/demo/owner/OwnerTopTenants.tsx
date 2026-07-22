'use client';

import { Building2, ChevronRight } from 'lucide-react';
import { formatOwnerInteger, formatOwnerMoney, ownerObjectTypeLabel } from './owner-formatters';
import type { OwnerTenant } from './owner-types';

type OwnerTopTenantsProps = {
  tenants: OwnerTenant[];
  onOpenTenant: (tenantId: string, trigger: HTMLElement) => void;
};

export default function OwnerTopTenants({ tenants, onOpenTenant }: OwnerTopTenantsProps) {
  const leaders = [...tenants]
    .sort((left, right) => right.totalAmount - left.totalAmount || left.shortName.localeCompare(right.shortName, 'ru'))
    .slice(0, 5);
  const maximum = leaders[0]?.totalAmount ?? 0;

  return (
    <section aria-labelledby="top-tenants-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Building2 aria-hidden="true" size={20} /></span>
        <div>
          <h3 id="top-tenants-title" className="font-bold text-slate-950">Крупнейшие начисления по арендаторам</h3>
          <p className="mt-0.5 text-sm text-slate-500">Пять арендаторов с наибольшей общей суммой</p>
        </div>
      </div>

      {leaders.length ? (
        <ol className="mt-5 grid gap-3">
          {leaders.map((tenant, index) => {
            const relative = maximum > 0 ? Math.round((tenant.totalAmount / maximum) * 100) : 0;
            return (
              <li key={tenant.tenantId}>
                <button
                  type="button"
                  onClick={(event) => onOpenTenant(tenant.tenantId, event.currentTarget)}
                  className="group relative min-h-24 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  aria-label={`Открыть арендатора ${tenant.shortName}, начислено ${formatOwnerMoney(tenant.totalAmount)}`}
                >
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-blue-50/80 transition group-hover:bg-blue-100/70" style={{ width: `${relative}%` }} />
                  <span className="relative flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-start justify-between gap-2">
                        <span>
                          <span className="block font-bold text-slate-950">{tenant.shortName}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{ownerObjectTypeLabel(tenant.objectType)}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-bold text-blue-800">{formatOwnerMoney(tenant.totalAmount)}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{formatOwnerInteger(tenant.operationCount)} операций</span>
                        </span>
                      </span>
                      <span className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                        <span>Гостевые проезды: <strong className="text-slate-900">{formatOwnerInteger(tenant.guestPassageCount)}</strong></span>
                        <span>Оплачено парковок: <strong className="text-slate-900">{formatOwnerInteger(tenant.webDiscountCount)}</strong></span>
                        <span className="sm:col-span-2">Гостевые заявки: <strong className="text-slate-900">{formatOwnerInteger(tenant.guestRequestCount)}</strong></span>
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" size={19} className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-9 text-center text-sm text-slate-600">
          За выбранный период начислений по арендаторам нет.
        </div>
      )}
    </section>
  );
}
