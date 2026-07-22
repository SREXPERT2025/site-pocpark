'use client';

import { BadgeCheck, CircleDollarSign } from 'lucide-react';
import OwnerReportDrawer from './OwnerReportDrawer';
import {
  formatOwnerDateTime,
  formatOwnerDuration,
  formatOwnerMoney,
  ownerOperationSourceLabel,
  ownerOperationStatusLabel,
  ownerVehicleTypeLabel,
} from './owner-formatters';
import type { OwnerWebDiscount } from './owner-types';

type OwnerParkingPaymentDrawerProps = {
  payment: OwnerWebDiscount | null;
  returnFocusTo?: HTMLElement | null;
  timezone?: string;
  onClose: () => void;
};

function DetailItem({ label, value, prominent = false, monospace = false }: { label: string; value: string; prominent?: boolean; monospace?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${prominent ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</dt>
      <dd title={value} className={`mt-1.5 break-words font-semibold ${monospace ? 'font-mono [overflow-wrap:anywhere]' : ''} ${prominent ? 'text-[1.2rem] text-blue-900' : 'text-slate-950'}`}>
        {value}
      </dd>
    </div>
  );
}

export default function OwnerParkingPaymentDrawer({
  payment,
  returnFocusTo,
  timezone = 'Europe/Moscow',
  onClose,
}: OwnerParkingPaymentDrawerProps) {
  return (
    <OwnerReportDrawer
      open={Boolean(payment)}
      eyebrow="Оплата парковки гостя"
      title={payment ? `Талон ${payment.ticketNumber}` : 'Детализация оплаты'}
      description="Начисление арендатору и параметры завершённой demo-операции."
      returnFocusTo={returnFocusTo}
      onClose={onClose}
    >
      {payment ? (
        <div className="grid gap-5">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <BadgeCheck aria-hidden="true" size={23} className="mt-0.5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-bold">{ownerOperationStatusLabel(payment.status)}</p>
              <p className="mt-1 text-sm leading-6 text-emerald-900">
                Гость платит 0 ₽. Исходная стоимость парковки начислена арендатору.
              </p>
            </div>
          </div>

          <section aria-labelledby="owner-payment-visit-title">
            <h3 id="owner-payment-visit-title" className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
              Посещение парковки
            </h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Талон" value={payment.ticketNumber} monospace />
              <DetailItem label="Арендатор" value={payment.tenantShortName} />
              <DetailItem label="Автомобиль" value={payment.vehicleNumber || 'Номер автомобиля не распознан'} monospace={Boolean(payment.vehicleNumber)} />
              <DetailItem label="Тип транспорта" value={ownerVehicleTypeLabel(payment.vehicleType)} />
              <DetailItem label="Въезд" value={formatOwnerDateTime(payment.enteredAt, timezone)} />
              <DetailItem label="Выезд" value={payment.exitedAt ? formatOwnerDateTime(payment.exitedAt, timezone) : 'Не зафиксирован'} />
              <DetailItem label="Длительность" value={formatOwnerDuration(payment.durationMinutes)} />
              <DetailItem label="Тариф" value={`${ownerVehicleTypeLabel(payment.vehicleType)} · demo-тариф`} />
              <DetailItem label="Почасовая ставка" value={`${formatOwnerMoney(payment.hourlyRate)} / час`} />
              <DetailItem label="Время применения" value={formatOwnerDateTime(payment.appliedAt, timezone)} />
            </dl>
          </section>

          <section aria-labelledby="owner-payment-calculation-title" className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
            <div className="flex items-center gap-2 text-blue-300">
              <CircleDollarSign aria-hidden="true" size={21} />
              <h3 id="owner-payment-calculation-title" className="text-sm font-bold uppercase tracking-[0.12em]">
                Расчёт операции
              </h3>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-sm text-slate-400">Исходная стоимость</dt>
                <dd className="mt-1 whitespace-nowrap text-xl font-bold">{formatOwnerMoney(payment.originalCost)}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-sm text-slate-400">Скидка</dt>
                <dd className="mt-1 text-xl font-bold">{payment.discountPercent}%</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <dt className="text-sm text-slate-400">К оплате гостю</dt>
                <dd className="mt-1 whitespace-nowrap text-xl font-bold">{formatOwnerMoney(payment.guestDue)}</dd>
              </div>
              <div className="rounded-2xl border border-blue-400/40 bg-blue-500/15 p-4">
                <dt className="text-sm text-blue-200">Начислено арендатору</dt>
                <dd className="mt-1 whitespace-nowrap text-xl font-bold text-white">{formatOwnerMoney(payment.tenantCharge)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="owner-payment-extra-title">
            <h3 id="owner-payment-extra-title" className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
              Дополнительные сведения
            </h3>
            <dl className="mt-3 grid gap-3">
              <DetailItem label="Комментарий" value={payment.comment || 'Комментарий не указан'} />
              <DetailItem label="Источник данных" value={ownerOperationSourceLabel(payment.source)} />
            </dl>
          </section>
        </div>
      ) : null}
    </OwnerReportDrawer>
  );
}
