import { BadgePercent, CarFront, ClipboardCheck, Clock3 } from 'lucide-react';
import {
  formatOwnerDateTime,
  formatOwnerMoney,
  ownerOperationStatusLabel,
  ownerOperationTypeLabel,
} from './owner-formatters';
import type { OwnerOperation } from './owner-types';

export default function OwnerRecentOperations({
  operations,
  timezone,
  onOpenAll,
  onOpenOperation,
}: {
  operations: OwnerOperation[];
  timezone: string;
  onOpenAll: () => void;
  onOpenOperation: (operation: OwnerOperation) => void;
}) {
  return (
    <section aria-labelledby="recent-operations-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
        <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Clock3 aria-hidden="true" size={20} /></span>
        <div>
          <h3 id="recent-operations-title" className="font-bold text-slate-950">Последние операции</h3>
          <p className="mt-0.5 text-sm text-slate-500">Гостевые проезды и оплата парковки</p>
        </div>
        </div>
        <button type="button" onClick={onOpenAll} className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-blue-700 underline-offset-4 hover:text-blue-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Все операции</button>
      </div>

      {operations.length ? (
        <ul className="mt-5 divide-y divide-slate-200">
          {operations.slice(0, 6).map((operation) => {
            const TypeIcon = operation.operationType === 'web_discount' ? BadgePercent : ClipboardCheck;
            const typeClass = operation.operationType === 'web_discount'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-blue-200 bg-blue-50 text-blue-800';
            return (
              <li key={operation.id} className="py-4 first:pt-0 last:pb-0">
                <article className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${typeClass}`}>
                        <TypeIcon aria-hidden="true" size={14} />
                        {ownerOperationTypeLabel(operation.operationType)}
                      </span>
                      <span className="text-xs text-slate-500">{ownerOperationStatusLabel(operation.status)}</span>
                    </div>
                    <p className="mt-2 truncate font-semibold text-slate-950" title={operation.tenantShortName}>{operation.tenantShortName}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Основание: <strong className="font-mono text-slate-700">{operation.basisNumber}</strong></span>
                      <span className="inline-flex items-center gap-1"><CarFront aria-hidden="true" size={13} />{operation.vehicleNumber || 'Номер не распознан'}</span>
                      <span>Въезд: {formatOwnerDateTime(operation.enteredAt, timezone)}</span>
                    </div>
                  </div>
                  <p className="text-[1.25rem] font-bold text-slate-950 sm:text-right">{formatOwnerMoney(operation.amount)}</p>
                  <button
                    type="button"
                    onClick={() => onOpenOperation(operation)}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:col-start-2"
                  >
                    Открыть реестр
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-9 text-center text-sm text-slate-600">
          За выбранный период операций нет.
        </div>
      )}
    </section>
  );
}
