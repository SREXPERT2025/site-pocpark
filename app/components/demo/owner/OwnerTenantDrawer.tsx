'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import {
  BadgePercent,
  CarFront,
  ClipboardCheck,
  Clock3,
  Loader2,
  RefreshCw,
  Truck,
  X,
} from 'lucide-react';
import {
  formatOwnerDateTime,
  formatOwnerDuration,
  formatOwnerInteger,
  formatOwnerMoney,
  ownerObjectTypeLabel,
  ownerOperationStatusLabel,
  ownerOperationTypeLabel,
} from './owner-formatters';
import type { OwnerOperation, OwnerTenantDetail } from './owner-types';

export type OwnerTenantDrawerProps = {
  open: boolean;
  detail: OwnerTenantDetail | null;
  loading: boolean;
  error?: string | null;
  returnFocusTo?: HTMLElement | null;
  onClose: () => void;
  onRetry?: () => void;
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function DrawerOperation({ operation, timezone }: { operation: OwnerOperation; timezone: string }) {
  const TypeIcon = operation.operationType === 'web_discount' ? BadgePercent : ClipboardCheck;
  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
          <TypeIcon aria-hidden="true" size={14} />
          {ownerOperationTypeLabel(operation.operationType)}
        </span>
        <strong className="text-slate-950">{formatOwnerMoney(operation.amount)}</strong>
      </div>
      <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Основание</dt>
          <dd className="mt-0.5 font-mono font-semibold text-slate-800">{operation.basisNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Автомобиль</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{operation.vehicleNumber || 'Номер не распознан'}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Въезд</dt>
          <dd className="mt-0.5 text-slate-800">{formatOwnerDateTime(operation.enteredAt, timezone)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Статус</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{ownerOperationStatusLabel(operation.status)}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function OwnerTenantDrawer({
  open,
  detail,
  loading,
  error,
  returnFocusTo,
  onClose,
  onRetry,
}: OwnerTenantDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const previousActive = returnFocusTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousOverflow = document.body.style.overflow;
    const overlay = overlayRef.current;
    const backgroundState: Array<{ element: HTMLElement; inert: boolean; ariaHidden: string | null }> = [];

    document.body.style.overflow = 'hidden';
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === overlay) continue;
      backgroundState.push({ element: child, inert: child.inert, ariaHidden: child.getAttribute('aria-hidden') });
      child.inert = true;
      child.setAttribute('aria-hidden', 'true');
    }

    const focusDialog = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusDialog);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      for (const item of backgroundState) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) item.element.removeAttribute('aria-hidden');
        else item.element.setAttribute('aria-hidden', item.ariaHidden);
      }
      window.requestAnimationFrame(() => {
        const target = returnFocusTo?.isConnected ? returnFocusTo : previousActive;
        target?.focus();
      });
    };
  }, [open, returnFocusTo]);

  if (!open || typeof document === 'undefined') return null;

  const content = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1400] flex justify-end bg-slate-950/60 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-tenant-drawer-title"
        aria-describedby="owner-tenant-drawer-description"
        tabIndex={-1}
        className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-5 py-5 text-white sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Детализация арендатора</p>
            <h2 id="owner-tenant-drawer-title" className="mt-1 truncate text-[1.5rem] font-bold leading-tight sm:text-[1.75rem]">
              {detail?.tenant.shortName ?? 'Карточка арендатора'}
            </h2>
            <p id="owner-tenant-drawer-description" className="mt-1 text-sm text-slate-300">
              {detail ? `Начисления и операции за период ${detail.period.label}` : 'Загрузка данных выбранного арендатора'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Закрыть карточку арендатора"
          >
            <X aria-hidden="true" size={21} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
          {loading ? (
            <div role="status" aria-live="polite" className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <span className="inline-flex items-center gap-3 font-semibold text-slate-700">
                <Loader2 aria-hidden="true" size={21} className="animate-spin text-blue-600" />
                Загружаем карточку арендатора…
              </span>
            </div>
          ) : error ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
              <p className="font-bold">Не удалось загрузить арендатора</p>
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
          ) : detail ? (
            <div className="grid gap-5">
              <section aria-labelledby="owner-tenant-about-title" className="rounded-2xl border border-slate-200 p-5">
                <h3 id="owner-tenant-about-title" className="font-bold text-slate-950">Об арендаторе</h3>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-500">Юридическое наименование</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{detail.tenant.legalName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">ИНН</dt>
                    <dd className="mt-1 font-mono font-semibold text-slate-950">{detail.tenant.inn}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Тип объекта</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{ownerObjectTypeLabel(detail.tenant.objectType)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Отчётный период</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{detail.period.label}</dd>
                  </div>
                </dl>
              </section>

              <section aria-labelledby="owner-tenant-finance-title" className="rounded-2xl bg-blue-950 p-5 text-white">
                <h3 id="owner-tenant-finance-title" className="text-sm font-semibold text-blue-200">Начислено арендатору</h3>
                <p className="mt-2 text-3xl font-black tracking-tight">{formatOwnerMoney(detail.summary.totalAmount)}</p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/10 p-3">
                    <dt className="flex items-center gap-2 text-xs text-blue-100"><CarFront aria-hidden="true" size={15} />Легковые начисления</dt>
                    <dd className="mt-1 font-bold">{formatOwnerMoney(detail.summary.carAmount)}</dd>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <dt className="flex items-center gap-2 text-xs text-blue-100"><Truck aria-hidden="true" size={15} />Грузовые начисления</dt>
                    <dd className="mt-1 font-bold">{formatOwnerMoney(detail.summary.truckAmount)}</dd>
                  </div>
                </dl>
              </section>

              <section aria-labelledby="owner-tenant-kpi-title">
                <h3 id="owner-tenant-kpi-title" className="font-bold text-slate-950">Показатели</h3>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    ['Гостевые заявки', formatOwnerInteger(detail.summary.guestRequestCount)],
                    ['Гостевые проезды', formatOwnerInteger(detail.summary.guestPassageCount)],
                    ['Оплачено парковок', formatOwnerInteger(detail.summary.webDiscountCount)],
                    ['Всего операций', formatOwnerInteger(detail.summary.operationCount)],
                    ['Среднее время', formatOwnerDuration(detail.summary.averageDurationMinutes)],
                    ['Завершено', formatOwnerInteger(detail.summary.completedOperationCount)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                      <dt className="text-xs leading-5 text-slate-500">{label}</dt>
                      <dd className="mt-1 text-lg font-bold text-slate-950">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section aria-labelledby="owner-tenant-operations-title">
                <div className="flex items-center gap-2">
                  <Clock3 aria-hidden="true" size={18} className="text-blue-700" />
                  <h3 id="owner-tenant-operations-title" className="font-bold text-slate-950">Последние операции</h3>
                </div>
                {detail.recentOperations.length ? (
                  <ul className="mt-3 grid gap-3">
                    {detail.recentOperations.map((operation) => (
                      <DrawerOperation key={operation.id} operation={operation} timezone={detail.period.timezone} />
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-600">
                    За выбранный период операций нет.
                  </div>
                )}
              </section>

              <p className="rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-600">
                Все организации, ИНН и финансовые показатели в демонстрации синтетические.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-600">
              Арендатор не выбран.
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return createPortal(content, document.body);
}
