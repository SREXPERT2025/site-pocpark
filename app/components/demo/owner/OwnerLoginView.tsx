'use client';

import { FormEvent } from 'react';
import { Check, KeyRound, LineChart } from 'lucide-react';

type OwnerLoginViewProps = {
  login: string;
  password: string;
  error: string;
  busy: boolean;
  onLoginChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function OwnerLoginView({
  login,
  password,
  error,
  busy,
  onLoginChange,
  onPasswordChange,
  onSubmit,
}: OwnerLoginViewProps) {
  return (
    <div className="grid min-h-[600px] bg-white lg:grid-cols-[1.05fr_0.95fr]" data-testid="owner-login">
      <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <span className="inline-flex rounded-2xl bg-blue-600 p-3">
            <LineChart aria-hidden="true" size={30} />
          </span>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Демо-комплекс РОСПАРК
          </p>
          <h3 className="mt-3 max-w-xl text-3xl font-bold leading-tight">
            Управление парковкой в цифрах
          </h3>
          <p className="mt-4 max-w-xl leading-7 text-slate-300">
            Единая сводка по арендаторам, гостевым проездам и оплате парковки — без переноса данных в Excel.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <strong className="block text-xl">32</strong>
            <span className="mt-1 block text-slate-400">demo-арендатора</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <strong className="block text-xl">2 сценария</strong>
            <span className="mt-1 block text-slate-400">заявки и WEB-оплата</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-5 sm:p-10 lg:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-md" noValidate>
          <span className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">
            <KeyRound aria-hidden="true" size={26} />
          </span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 sm:text-sm">
            Демо-комплекс РОСПАРК
          </p>
          <h2 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
            Вход владельца парковки
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            Используется та же безопасная demo-сессия, что и в кабинетах арендатора.
          </p>

          <div className="mt-8 grid gap-5">
            <label htmlFor="owner-demo-login" className="grid gap-2 text-sm font-semibold text-slate-800">
              Логин
              <input
                id="owner-demo-login"
                value={login}
                onChange={(event) => onLoginChange(event.target.value)}
                autoComplete="username"
                className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label htmlFor="owner-demo-password" className="grid gap-2 text-sm font-semibold text-slate-800">
              Пароль
              <input
                id="owner-demo-password"
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                autoComplete="current-password"
                className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Демо-доступ: логин <strong>TEST</strong>, пароль <strong>TEST</strong>.
          </div>
          {error ? <p role="alert" className="mt-4 text-sm font-medium text-rose-700">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? 'Входим…' : 'Войти в кабинет'}
            <Check aria-hidden="true" size={18} />
          </button>
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            Все организации, ИНН, автомобили, операции и суммы в кабинете синтетические.
          </p>
        </form>
      </div>
    </div>
  );
}
