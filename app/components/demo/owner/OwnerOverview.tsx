'use client';

import Link from 'next/link';
import { BadgePercent, ClipboardList, WalletCards } from 'lucide-react';
import OwnerChargeStructure from './OwnerChargeStructure';
import OwnerRecentOperations from './OwnerRecentOperations';
import OwnerSummaryCards from './OwnerSummaryCards';
import OwnerTopTenants from './OwnerTopTenants';
import { OwnerCurrentEmptyState, OwnerErrorState, OwnerLoadingState } from './OwnerStates';
import type { OwnerOperation, OwnerPeriodMode, OwnerSummary, OwnerTenant } from './owner-types';

type OwnerOverviewProps = {
  mode: OwnerPeriodMode;
  summary: OwnerSummary | null;
  tenants: OwnerTenant[];
  operations: OwnerOperation[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpenTenant: (tenantId: string, trigger: HTMLElement) => void;
};

export default function OwnerOverview({
  mode,
  summary,
  tenants,
  operations,
  loading,
  error,
  onRetry,
  onOpenTenant,
}: OwnerOverviewProps) {
  if (loading && !summary) return <OwnerLoadingState label="Собираем сводку парковки…" />;
  if (error && !summary) return <OwnerErrorState message={error} onRetry={onRetry} />;
  if (!summary) return null;

  const carAmount = tenants.reduce((total, tenant) => total + tenant.carAmount, 0);
  const truckAmount = tenants.reduce((total, tenant) => total + tenant.truckAmount, 0);
  const currentIsEmpty = mode === 'current'
    && summary.amounts.totalTenantCharges === 0
    && summary.completedOperationCount === 0;

  return (
    <div className="grid gap-6" aria-busy={loading}>
      {error ? <OwnerErrorState message={error} onRetry={onRetry} compact /> : null}

      {currentIsEmpty ? (
        <OwnerCurrentEmptyState>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/demo/gostevaya-zayavka" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <ClipboardList aria-hidden="true" size={18} /> Создать гостевую заявку
            </Link>
            <Link href="/demo/web-skidki" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <BadgePercent aria-hidden="true" size={18} /> Оплатить парковку гостя
            </Link>
          </div>
        </OwnerCurrentEmptyState>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-sm" aria-labelledby="owner-total-title">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3 text-blue-300">
              <WalletCards aria-hidden="true" size={24} />
              <p id="owner-total-title" className="text-xs font-semibold uppercase tracking-[0.15em]">Начислено арендаторам</p>
            </div>
            <p className="mt-3 text-[2.25rem] font-bold leading-none tracking-tight sm:text-[3.25rem]">
              {new Intl.NumberFormat('ru-RU').format(summary.amounts.totalTenantCharges)} ₽
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Гостевые проезды и оплаты парковки, начисленные арендаторам за выбранный период.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm lg:min-w-[340px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-slate-400">Гостевые проезды</dt>
              <dd className="mt-2 whitespace-nowrap text-[1.05rem] font-bold sm:text-lg">{new Intl.NumberFormat('ru-RU').format(summary.amounts.guestPassages)} ₽</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-slate-400">Оплата парковки гостей</dt>
              <dd className="mt-2 whitespace-nowrap text-[1.05rem] font-bold sm:text-lg">{new Intl.NumberFormat('ru-RU').format(summary.amounts.webDiscounts)} ₽</dd>
            </div>
          </dl>
        </div>
      </section>

      <OwnerSummaryCards summary={summary} />

      <OwnerChargeStructure
        summary={summary}
        carAmount={carAmount}
        truckAmount={truckAmount}
      />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
        <OwnerTopTenants tenants={tenants.slice(0, 5)} onOpenTenant={onOpenTenant} />
        <OwnerRecentOperations operations={operations} timezone={summary.period.timezone} />
      </div>
    </div>
  );
}
