import { CarFront, ClipboardCheck, Truck } from 'lucide-react';
import { formatOwnerInteger, formatOwnerMoney } from './owner-formatters';
import type { OwnerSummary } from './owner-types';

type ChargeRow = {
  label: string;
  amount: number;
  count: number;
  colorClass: string;
  actionLabel: string;
  onOpen: () => void;
};

function share(amount: number, total: number) {
  return total > 0 ? Math.round((amount / total) * 100) : 0;
}

function ChargeBar({ row, total }: { row: ChargeRow; total: number }) {
  const percent = share(row.amount, total);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{row.label}</p>
          <p className="mt-1 text-xs text-slate-500">{formatOwnerInteger(row.count)} операций</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-950">{formatOwnerMoney(row.amount)}</p>
          <p className="mt-1 text-xs font-semibold text-blue-700">{percent}% от общей суммы</p>
        </div>
      </div>
      <div
        role="img"
        aria-label={`${row.label}: ${formatOwnerMoney(row.amount)}, ${formatOwnerInteger(row.count)} операций, ${percent}% от общей суммы`}
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div className={`h-full rounded-full ${row.colorClass}`} style={{ width: `${percent}%` }} />
      </div>
      <button
        type="button"
        onClick={row.onOpen}
        className="mt-3 inline-flex min-h-11 items-center px-1 text-sm font-semibold text-blue-700 underline-offset-4 hover:text-blue-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {row.actionLabel}
      </button>
    </div>
  );
}

export default function OwnerChargeStructure({
  summary,
  carAmount,
  truckAmount,
  onOpenGuestPassages,
  onOpenPayments,
}: {
  summary: OwnerSummary;
  carAmount: number;
  truckAmount: number;
  onOpenGuestPassages: () => void;
  onOpenPayments: () => void;
}) {
  const total = summary.amounts.totalTenantCharges;
  const chargeRows: ChargeRow[] = [
    {
      label: 'Гостевые проезды',
      amount: summary.amounts.guestPassages,
      count: summary.guestPassageCount,
      colorClass: 'bg-blue-600',
      actionLabel: 'Открыть реестр проездов',
      onOpen: onOpenGuestPassages,
    },
    {
      label: 'Оплата парковки гостей',
      amount: summary.amounts.webDiscounts,
      count: summary.webDiscountCount,
      colorClass: 'bg-emerald-500',
      actionLabel: 'Открыть реестр оплат',
      onOpen: onOpenPayments,
    },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section aria-labelledby="charge-structure-title" className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><ClipboardCheck aria-hidden="true" size={20} /></span>
          <div>
            <h3 id="charge-structure-title" className="font-bold text-slate-950">Структура начислений</h3>
            <p className="mt-0.5 text-sm text-slate-500">По двум гостевым сценариям</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {chargeRows.map((row) => <ChargeBar key={row.label} row={row} total={total} />)}
        </div>
      </section>

      <section aria-labelledby="vehicle-structure-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h3 id="vehicle-structure-title" className="font-bold text-slate-950">По типу транспорта</h3>
          <p className="mt-1 text-sm text-slate-500">Количество операций и начисленные суммы</p>
        </div>
        <dl className="mt-5 grid gap-3 min-[390px]:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <dt className="flex items-center gap-2 font-semibold text-blue-950"><CarFront aria-hidden="true" size={19} />Легковой транспорт</dt>
            <dd className="mt-4 text-[1.75rem] font-bold leading-tight text-blue-950 sm:text-[2rem]">{formatOwnerMoney(carAmount)}</dd>
            <dd className="mt-1 text-sm text-blue-800">{formatOwnerInteger(summary.carOperationCount)} операций</dd>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <dt className="flex items-center gap-2 font-semibold text-amber-950"><Truck aria-hidden="true" size={19} />Грузовой транспорт</dt>
            <dd className="mt-4 text-[1.75rem] font-bold leading-tight text-amber-950 sm:text-[2rem]">{formatOwnerMoney(truckAmount)}</dd>
            <dd className="mt-1 text-sm text-amber-800">{formatOwnerInteger(summary.truckOperationCount)} операций</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
