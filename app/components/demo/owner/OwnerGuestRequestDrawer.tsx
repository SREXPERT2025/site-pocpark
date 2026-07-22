'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CarFront, Clock3, Loader2, RefreshCw } from 'lucide-react';
import OwnerReportDrawer from './OwnerReportDrawer';
import {
  formatOwnerDateTime,
  formatOwnerDuration,
  formatOwnerInteger,
  formatOwnerMoney,
  ownerGuestRequestStatusLabel,
  ownerGuestRequestTypeLabel,
  ownerOperationStatusLabel,
} from './owner-formatters';
import type {
  OwnerGuestRequest,
  OwnerOperationsResponse,
  OwnerPeriodMode,
  OwnerOperation,
} from './owner-types';

type OwnerGuestRequestDrawerProps = {
  request: OwnerGuestRequest | null;
  periodMode: OwnerPeriodMode;
  timezone?: string;
  returnFocusTo?: HTMLElement | null;
  onClose: () => void;
  onUnauthorized: () => void;
};

class GuestPassagesError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function readPassagesResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as (
    OwnerOperationsResponse & { error?: string; code?: string }
  ) | null;
  if (!response.ok || !payload) {
    throw new GuestPassagesError(
      response.status,
      payload?.code || 'INTERNAL_ERROR',
      payload?.error || 'Не удалось загрузить фактические проезды.',
    );
  }
  return payload;
}

function passagesErrorMessage(error: unknown) {
  if (error instanceof GuestPassagesError && error.code === 'INVALID_QUERY') {
    return 'Параметры детализации устарели. Повторите загрузку.';
  }
  return 'Не удалось загрузить фактические проезды. Попробуйте ещё раз.';
}

function RequestFact({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
      <dt className="text-xs leading-5 text-slate-500">{label}</dt>
      <dd title={value} className={`mt-1 break-words font-semibold text-slate-950 ${monospace ? 'font-mono [overflow-wrap:anywhere]' : ''}`}>{value}</dd>
    </div>
  );
}

function PassageCard({ passage, timezone }: { passage: OwnerOperation; timezone: string }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
          <CarFront aria-hidden="true" size={14} />
          Гостевой проезд
        </span>
        <strong className="whitespace-nowrap text-slate-950">{formatOwnerMoney(passage.amount)}</strong>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Въезд</dt>
          <dd className="mt-1 font-medium text-slate-900">{formatOwnerDateTime(passage.enteredAt, timezone)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Выезд</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {passage.exitedAt ? formatOwnerDateTime(passage.exitedAt, timezone) : 'Автомобиль на территории'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Длительность</dt>
          <dd className="mt-1 font-medium text-slate-900">{formatOwnerDuration(passage.durationMinutes)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Автомобиль</dt>
          <dd className="mt-1 break-words font-semibold text-slate-900">
            {passage.vehicleNumber || 'Номер автомобиля не распознан'}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-slate-500">Статус</dt>
          <dd className="mt-1 font-semibold text-slate-900">{ownerOperationStatusLabel(passage.status)}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function OwnerGuestRequestDrawer({
  request,
  periodMode,
  timezone = 'Europe/Moscow',
  returnFocusTo,
  onClose,
  onUnauthorized,
}: OwnerGuestRequestDrawerProps) {
  const [passages, setPassages] = useState<OwnerOperation[]>([]);
  const [passageTimezone, setPassageTimezone] = useState(timezone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const loadPassages = useCallback(async () => {
    if (!request) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = ++generationRef.current;
    setLoading(true);
    setError('');
    setPassages([]);

    try {
      const params = new URLSearchParams({
        period: periodMode,
        operationType: 'guest_passage',
        search: request.requestNumber,
        page: '1',
        pageSize: '100',
        sort: 'enteredAt',
        order: 'asc',
      });
      const response = await fetch(`/api/demo/owner/operations?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (response.status === 401) {
        throw new GuestPassagesError(401, 'UNAUTHORIZED', 'Demo-сессия завершилась.');
      }
      const payload = await readPassagesResponse(response);
      if (controller.signal.aborted || generation !== generationRef.current) return;

      setPassages(payload.items.filter((item) => (
        item.operationType === 'guest_passage' && item.basisNumber === request.requestNumber
      )));
      setPassageTimezone(payload.period.timezone || timezone);
    } catch (nextError) {
      if (controller.signal.aborted || generation !== generationRef.current) return;
      if (nextError instanceof GuestPassagesError && nextError.status === 401) {
        onUnauthorized();
        return;
      }
      setError(passagesErrorMessage(nextError));
    } finally {
      if (!controller.signal.aborted && generation === generationRef.current) setLoading(false);
    }
  }, [onUnauthorized, periodMode, request, timezone]);

  useEffect(() => {
    if (!request) {
      abortRef.current?.abort();
      generationRef.current += 1;
      setPassages([]);
      setError('');
      setLoading(false);
      return undefined;
    }
    void loadPassages();
    return () => abortRef.current?.abort();
  }, [loadPassages, request]);

  return (
    <OwnerReportDrawer
      open={Boolean(request)}
      eyebrow="Детализация гостевой заявки"
      title={request?.requestNumber || 'Гостевая заявка'}
      description={request ? `${request.tenantShortName} · ${ownerGuestRequestStatusLabel(request.status)}` : 'Загрузка заявки'}
      returnFocusTo={returnFocusTo}
      onClose={onClose}
    >
      {request ? (
        <div className="grid gap-5">
          <section aria-labelledby="guest-request-main-title">
            <h3 id="guest-request-main-title" className="font-bold text-slate-950">Заявка</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <RequestFact label="Номер заявки" value={request.requestNumber} monospace />
              <RequestFact label="Арендатор" value={request.tenantShortName} />
              <RequestFact label="Гость" value={request.guestName} />
              <RequestFact label="Автомобиль" value={request.vehicleNumber || 'Номер автомобиля не распознан'} monospace={Boolean(request.vehicleNumber)} />
              <RequestFact label="Тип" value={ownerGuestRequestTypeLabel(request.requestType)} />
              <RequestFact label="Статус" value={ownerGuestRequestStatusLabel(request.status)} />
              <RequestFact label="Действует с" value={formatOwnerDateTime(request.validFrom, timezone)} />
              <RequestFact label="Действует до" value={formatOwnerDateTime(request.validUntil, timezone)} />
              <RequestFact label="Создана" value={formatOwnerDateTime(request.createdAt, timezone)} />
            </dl>
          </section>

          <section aria-labelledby="guest-request-totals-title" className="rounded-2xl bg-blue-950 p-5 text-white">
            <h3 id="guest-request-totals-title" className="text-sm font-semibold text-blue-200">Итоги по фактическим проездам</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/10 p-3">
                <dt className="text-xs text-blue-100">Проезды</dt>
                <dd className="mt-1 text-xl font-bold">{formatOwnerInteger(request.passageCount)}</dd>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <dt className="text-xs text-blue-100">Общее время</dt>
                <dd className="mt-1 text-xl font-bold">{formatOwnerDuration(request.totalDurationMinutes)}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-white/10 p-3 sm:col-span-1">
                <dt className="text-xs text-blue-100">Начислено арендатору</dt>
                <dd className="mt-1 whitespace-nowrap text-xl font-bold">{formatOwnerMoney(request.totalAmount)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="guest-request-passages-title">
            <div className="flex items-center gap-2">
              <Clock3 aria-hidden="true" size={18} className="text-blue-700" />
              <h3 id="guest-request-passages-title" className="font-bold text-slate-950">
                Фактические проезды{request.passageCount ? ` · ${formatOwnerInteger(request.passageCount)}` : ''}
              </h3>
            </div>

            {loading ? (
              <div role="status" aria-live="polite" className="mt-3 flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <span className="inline-flex items-center gap-3 font-semibold text-slate-700">
                  <Loader2 aria-hidden="true" size={20} className="animate-spin text-blue-600" />
                  Загружаем проезды…
                </span>
              </div>
            ) : error ? (
              <div role="alert" className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
                <p className="font-bold">Не удалось загрузить проезды</p>
                <p className="mt-1 text-sm leading-6">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadPassages()}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
                >
                  <RefreshCw aria-hidden="true" size={17} />
                  Повторить загрузку
                </button>
              </div>
            ) : passages.length ? (
              <ul className="mt-3 grid gap-3">
                {passages.map((passage) => (
                  <PassageCard key={passage.id} passage={passage} timezone={passageTimezone} />
                ))}
              </ul>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-600">
                По этой заявке фактических проездов пока нет.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </OwnerReportDrawer>
  );
}
