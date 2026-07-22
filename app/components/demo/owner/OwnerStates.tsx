import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertCircle, BadgePercent, ClipboardPlus, Loader2, RefreshCw } from 'lucide-react';

export function OwnerLoadingState({ label = 'Загружаем данные кабинета…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <Loader2 aria-hidden="true" size={20} className="animate-spin text-blue-600" />
        {label}
      </div>
      <div aria-hidden="true" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function OwnerErrorState({
  message,
  onRetry,
  compact = false,
}: {
  message: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div role="alert" className={`rounded-3xl border border-rose-200 bg-rose-50 text-rose-950 ${compact ? 'p-4' : 'p-5 sm:p-7'}`}>
      <div className="flex items-start gap-3">
        <AlertCircle aria-hidden="true" size={22} className="mt-0.5 shrink-0 text-rose-700" />
        <div>
          <h3 className="font-bold">Не удалось загрузить данные</h3>
          <p className="mt-1 text-sm leading-6 text-rose-900">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className={`${compact ? 'mt-3 min-h-11 px-4 py-2 text-sm' : 'mt-5 min-h-12 px-5 py-3'} inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2`}
      >
        <RefreshCw aria-hidden="true" size={18} />
        Повторить загрузку
      </button>
    </div>
  );
}

export function OwnerCurrentEmptyState({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center sm:px-8 sm:py-12">
      <div className="mx-auto inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">
        <AlertCircle aria-hidden="true" size={26} />
      </div>
      <h3 className="mt-4 text-[1.4rem] font-bold leading-tight text-slate-950">В текущей demo-сессии пока нет начислений</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        Создайте гостевую заявку или оплатите парковку гостя, затем вернитесь в кабинет владельца.
      </p>
      {children ?? (
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/demo/gostevaya-zayavka"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
          >
            <ClipboardPlus aria-hidden="true" size={18} />
            Создать гостевую заявку
          </Link>
          <Link
            href="/demo/web-skidki"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-800 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <BadgePercent aria-hidden="true" size={18} />
            Оплатить парковку гостя
          </Link>
        </div>
      )}
    </div>
  );
}
