'use client';

import { useCallback, useEffect, useState } from 'react';
import AiTraceViewer from './AiTraceViewer';

type SessionSummary = {
  id: string;
  mode: 'preview' | 'production';
  sourcePage: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  answeredCount: number;
  errorCount: number;
  testLeadCount: number;
  productionLeadCount: number;
  latestQuestion: string | null;
};

type SessionDetails = {
  id: string;
  mode: 'preview' | 'production';
  sourcePage: string;
  createdAt: string;
  updatedAt: string;
  traceStorageAvailable: boolean;
  turns: Array<{
    id: string;
    sourcePage: string;
    userContent: string;
    assistantContent: string | null;
    route: string | null;
    templateId: string | null;
    status: 'pending' | 'answered' | 'error';
    errorCode: string | null;
    elapsedMs: number | null;
    createdAt: string;
    traceSummary: {
      publicationStatus: 'published' | 'blocked' | 'fallback' | 'error';
      executor: string | null;
      evaluatorStatus: string | null;
      hasWarning: boolean;
      instructionLeakWarning: boolean;
      firstFailureStage: string | null;
      totalLatencyMs: number | null;
      traceAvailable: boolean;
    } | null;
  }>;
  testLeads: Array<{
    id: string;
    name: string;
    contact: string;
    objectDescription: string;
    taskDescription: string;
    maxPreview: string;
    createdAt: string;
  }>;
  productionLeads: Array<{
    id: string;
    publicId: string;
    registryLeadId: string;
    createdAt: string;
  }>;
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

export default function AiWidgetAdminDashboard({
  displayName,
  role,
}: {
  displayName: string;
  role: 'director' | 'sales_head';
}) {
  const [items, setItems] = useState<SessionSummary[]>([]);
  const [selected, setSelected] = useState<SessionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [traceTurnId, setTraceTurnId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/ai-widget', {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ошибка загрузки.');
      setItems(result.items || []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Ошибка загрузки.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openSession = async (id: string) => {
    setError('');
    try {
      const response = await fetch(
        `/api/admin/ai-widget?sessionId=${encodeURIComponent(id)}`,
        { cache: 'no-store' },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ошибка загрузки.');
      setSelected(result.session);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Ошибка загрузки.',
      );
    }
  };

  const deleteSession = async () => {
    if (!selected || role !== 'director') return;
    const confirmed = window.confirm(
      'Безвозвратно удалить диалог и связанные с ним ссылки на заявки?',
    );
    if (!confirmed) return;
    const response = await fetch(
      `/api/admin/ai-widget/${encodeURIComponent(selected.id)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: selected.id }),
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setError(result?.error || 'Не удалось удалить диалог.');
      return;
    }
    setSelected(null);
    await loadList();
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="bg-slate-950 px-5 py-7 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
              РОСПАРК · служебный контур
            </p>
            <h1 className="mt-2 text-3xl font-black">
              Диалоги AI-виджета
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {displayName} · {role === 'director' ? 'директор' : 'РОП'}
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            <a
              href="/admin/leads"
              className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-white/10"
            >
              Реестр лидов
            </a>
            <a
              href="/api/admin/ai-widget/export"
              className="rounded-xl bg-blue-600 px-4 py-2 hover:bg-blue-700"
            >
              Скачать CSV
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">Все диалоги</h2>
            <button
              type="button"
              onClick={() => void loadList()}
              className="text-sm font-semibold text-blue-700"
            >
              Обновить
            </button>
          </div>
          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Загрузка…</p>
          ) : null}
          {!isLoading && items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Диалогов пока нет.
            </p>
          ) : null}
          <div className="mt-4 grid gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openSession(item.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  selected?.id === item.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-blue-700">
                    {item.mode === 'production' ? 'LIVE' : 'PREVIEW'}
                    {' · '}
                    {item.turnCount} сообщ.
                  </span>
                  <span className="text-xs text-slate-500">
                    {dateTime(item.updatedAt)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold">
                  {item.latestQuestion || 'Без вопроса'}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {item.sourcePage}
                </p>
                {item.testLeadCount > 0 ? (
                  <p className="mt-2 text-xs font-bold text-emerald-700">
                    Тестовых карточек: {item.testLeadCount}
                  </p>
                ) : null}
                {item.productionLeadCount > 0 ? (
                  <p className="mt-2 text-xs font-bold text-emerald-700">
                    Рабочих заявок: {item.productionLeadCount}
                  </p>
                ) : null}
                {item.errorCount > 0 ? (
                  <p className="mt-1 text-xs font-bold text-red-700">
                    Ошибок: {item.errorCount}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          {error ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {!selected ? (
            <p className="text-sm text-slate-500">
              Выберите диалог слева.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    {selected.mode === 'production'
                      ? 'Рабочий диалог'
                      : 'Закрытый preview'}
                  </p>
                  <h2 className="mt-1 break-all text-lg font-black">
                    {selected.id}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selected.sourcePage} · {dateTime(selected.createdAt)}
                  </p>
                </div>
                {role === 'director' ? (
                  <button
                    type="button"
                    onClick={() => void deleteSession()}
                    className="text-xs font-semibold text-red-700 underline"
                  >
                    Удалить безвозвратно
                  </button>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4">
                {!selected.traceStorageAvailable && role === 'director' ? (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                    Trace временно недоступен; история диалога продолжает работать.
                  </p>
                ) : null}
                {selected.turns.map((turn) => (
                  <article
                    key={turn.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                      <span>{dateTime(turn.createdAt)}</span>
                      <span>
                        {turn.route || turn.status}
                        {turn.elapsedMs !== null
                          ? ` · ${turn.elapsedMs} мс`
                          : ''}
                      </span>
                    </div>
                    <div className="mt-3 rounded-xl bg-blue-700 p-3 text-sm leading-6 text-white">
                      {turn.userContent}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-100 p-3 text-sm leading-6">
                      {turn.assistantContent
                        || turn.errorCode
                        || 'Ответ не завершён'}
                    </div>
                    {turn.traceSummary ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                        <p className={`text-xs font-bold ${
                          turn.traceSummary.instructionLeakWarning
                            ? 'text-red-700' : 'text-slate-600'
                        }`}>
                          AI Core · {turn.traceSummary.executor || 'до Runtime'} · {' '}
                          {turn.traceSummary.totalLatencyMs !== null
                            ? `${turn.traceSummary.totalLatencyMs} мс · ` : ''}
                          {turn.traceSummary.publicationStatus.toUpperCase()}
                          {turn.traceSummary.instructionLeakWarning
                            ? ' · INSTRUCTION LEAK' : ''}
                        </p>
                        {role === 'director' ? (
                          <button
                            type="button"
                            onClick={() => setTraceTurnId(turn.id)}
                            className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                          >
                            {turn.traceSummary.traceAvailable
                              ? 'Диагностика' : 'Trace недоступен'}
                          </button>
                        ) : null}
                      </div>
                    ) : role === 'director' && turn.route?.includes('ai_core') ? (
                      <p className="mt-3 text-xs font-semibold text-slate-500">
                        Trace для этого исторического turn недоступен.
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>

              {selected.testLeads.map((lead) => (
                <article
                  key={lead.id}
                  className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <p className="font-black text-emerald-900">
                    Тестовая карточка
                  </p>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div><dt className="font-bold">Имя</dt><dd>{lead.name}</dd></div>
                    <div><dt className="font-bold">Контакт</dt><dd>{lead.contact}</dd></div>
                    <div><dt className="font-bold">Объект</dt><dd>{lead.objectDescription}</dd></div>
                    <div><dt className="font-bold">Задача</dt><dd>{lead.taskDescription}</dd></div>
                  </dl>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-bold text-blue-800">
                      Будущий текст MAX
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-xs leading-5">
                      {lead.maxPreview}
                    </pre>
                  </details>
                </article>
              ))}
              {selected.productionLeads.map((lead) => (
                <article
                  key={lead.id}
                  className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                >
                  <p className="font-black text-emerald-900">
                    Рабочая заявка {lead.publicId}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Зарегистрирована {dateTime(lead.createdAt)}. Имя и телефон
                    находятся только в защищённом реестре лидов.
                  </p>
                  <a
                    href={`/admin/leads?search=${encodeURIComponent(lead.publicId)}`}
                    className="mt-3 inline-flex rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Открыть в реестре
                  </a>
                </article>
              ))}
            </>
          )}
        </section>
      </div>
      {traceTurnId ? (
        <AiTraceViewer
          turnId={traceTurnId}
          onClose={() => setTraceTurnId(null)}
        />
      ) : null}
    </main>
  );
}
