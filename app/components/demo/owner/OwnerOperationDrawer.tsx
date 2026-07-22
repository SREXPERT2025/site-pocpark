'use client';

import { ArrowRight, CarFront, CalendarClock, Clock3, ReceiptText } from 'lucide-react';
import type { ReactNode } from 'react';
import OwnerReportDrawer from './OwnerReportDrawer';
import {
  formatOwnerDateTime,
  formatOwnerDuration,
  formatOwnerMoney,
  ownerOperationSourceLabel,
  ownerOperationStatusLabel,
  ownerOperationTypeLabel,
  ownerVehicleTypeLabel,
} from './owner-formatters';
import type { OwnerOperation } from './owner-types';

type OwnerOperationDrawerProps = {
  operation: OwnerOperation | null;
  timezone: string;
  returnFocusTo?: HTMLElement | null;
  onClose: () => void;
  onOpenPayments: (tenantId: string) => void;
};

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1.5 break-words font-semibold text-slate-950">{children}</dd>
    </div>
  );
}

export default function OwnerOperationDrawer({
  operation,
  timezone,
  returnFocusTo,
  onClose,
  onOpenPayments,
}: OwnerOperationDrawerProps) {
  if (!operation) return null;
  const isPayment = operation.operationType === 'web_discount';

  return (
    <OwnerReportDrawer
      open
      eyebrow="Детализация операции"
      title={ownerOperationTypeLabel(operation.operationType)}
      description={`${isPayment ? 'Талон' : 'Заявка'} ${operation.basisNumber}`}
      returnFocusTo={returnFocusTo}
      onClose={onClose}
    >
      <div className="grid gap-5">
        <section className="rounded-2xl bg-slate-950 p-5 text-white" aria-labelledby="owner-operation-amount-title">
          <p id="owner-operation-amount-title" className="text-sm font-semibold text-blue-200">
            {isPayment ? 'Начислено арендатору' : 'Сумма гостевого проезда'}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight">{formatOwnerMoney(operation.amount)}</p>
          <span className="mt-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold">
            {ownerOperationStatusLabel(operation.status)}
          </span>
        </section>

        <section aria-labelledby="owner-operation-main-title">
          <h3 id="owner-operation-main-title" className="flex items-center gap-2 font-bold text-slate-950">
            <ReceiptText aria-hidden="true" size={19} className="text-blue-700" /> Операция
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Detail label={isPayment ? 'Номер талона' : 'Номер заявки'}>
              <span title={operation.basisNumber} className="font-mono [overflow-wrap:anywhere]">{operation.basisNumber}</span>
            </Detail>
            <Detail label="Арендатор">{operation.tenantShortName}</Detail>
            <Detail label="Автомобиль"><span title={operation.vehicleNumber || 'Номер автомобиля не распознан'} className={operation.vehicleNumber ? 'font-mono' : ''}>{operation.vehicleNumber || 'Номер автомобиля не распознан'}</span></Detail>
            <Detail label="Тип транспорта">{ownerVehicleTypeLabel(operation.vehicleType)}</Detail>
          </dl>
        </section>

        <section aria-labelledby="owner-operation-time-title">
          <h3 id="owner-operation-time-title" className="flex items-center gap-2 font-bold text-slate-950">
            <CalendarClock aria-hidden="true" size={19} className="text-blue-700" /> Время на парковке
          </h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Detail label="Въезд">{formatOwnerDateTime(operation.enteredAt, timezone)}</Detail>
            <Detail label="Выезд">{operation.exitedAt ? formatOwnerDateTime(operation.exitedAt, timezone) : 'Автомобиль на территории'}</Detail>
            <Detail label="Длительность"><span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" size={16} />{formatOwnerDuration(operation.durationMinutes)}</span></Detail>
            <Detail label="Источник данных">{ownerOperationSourceLabel(operation.source)}</Detail>
          </dl>
        </section>

        {isPayment ? (
          <button
            type="button"
            onClick={() => onOpenPayments(operation.tenantId)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Открыть в реестре оплат <ArrowRight aria-hidden="true" size={18} />
          </button>
        ) : null}

        <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-950">
          <CarFront aria-hidden="true" size={16} className="mb-1" /> Все данные синтетические. Реальные платежи и персональные данные не используются.
        </p>
      </div>
    </OwnerReportDrawer>
  );
}
