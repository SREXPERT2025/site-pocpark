'use client';

import { useId } from 'react';
import { CalendarRange, Loader2 } from 'lucide-react';
import type { OwnerPeriod, OwnerPeriodMode } from './owner-types';

type OwnerPeriodSwitcherProps = {
  value: OwnerPeriodMode;
  period: OwnerPeriod | null;
  busy: boolean;
  onChange: (period: OwnerPeriodMode) => void;
};

export default function OwnerPeriodSwitcher({ value, period, busy, onChange }: OwnerPeriodSwitcherProps) {
  const id = useId();
  const options: Array<{ value: OwnerPeriodMode; label: string; description: string }> = [
    {
      value: 'previous-month',
      label: value === 'previous-month' && period ? period.label : 'Предыдущий месяц',
      description: 'Закрытый отчётный период',
    },
    {
      value: 'current',
      label: 'Текущий месяц',
      description: 'Данные текущей demo-сессии',
    },
  ];

  return (
    <fieldset className="min-w-0" aria-busy={busy}>
      <legend className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        <CalendarRange aria-hidden="true" size={16} />
        Отчётный период
      </legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Выбор отчётного периода">
        {options.map((option) => {
          const active = value === option.value;
          const inputId = `${id}-${option.value}`;
          return (
            <div key={option.value} className="relative min-w-0">
              <input
                id={inputId}
                type="radio"
                name={`${id}-period`}
                value={option.value}
                checked={active}
                disabled={busy}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border px-4 py-2.5 transition peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 ${active ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'} ${busy ? 'cursor-wait opacity-70' : ''}`}
              >
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  <span className="min-w-0 truncate">{option.label}</span>
                  {active ? <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">Выбран</span> : null}
                  {active && busy ? <Loader2 aria-hidden="true" size={14} className="shrink-0 animate-spin text-blue-700" /> : null}
                </span>
                <span className="mt-0.5 text-xs text-slate-500">{option.description}</span>
              </label>
            </div>
          );
        })}
      </div>
      <p className="mt-2 min-h-5 text-xs text-slate-500" aria-live="polite">
        {period ? `${period.label} · ${period.timezone}` : 'Определяем период…'}
      </p>
    </fieldset>
  );
}
