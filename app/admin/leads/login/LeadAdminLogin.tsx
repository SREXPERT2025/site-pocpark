'use client';

import { FormEvent, useState } from 'react';

export default function LeadAdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/leads/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json().catch(() => null) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(payload?.error || 'Не удалось выполнить вход.');
        return;
      }
      window.location.replace('/admin/leads');
    } catch {
      setError('Сервер временно недоступен.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          РОСПАРК
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Реестр лидов
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Закрытый служебный интерфейс. Используйте свою персональную учётную
          запись.
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-800">Логин</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={64}
              required
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-800">Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={256}
              required
              className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? 'Проверяем…' : 'Войти'}
          </button>
        </form>
      </div>
    </main>
  );
}
