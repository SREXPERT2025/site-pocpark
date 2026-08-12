'use client';

import { useEffect, useMemo, useState } from 'react';

type TraceStage = {
  name: string;
  status: 'pass' | 'warn' | 'blocked' | 'not_used' | 'error' | 'not_reached';
  summary: string;
  input: unknown;
  output: unknown;
  reason_codes: string[];
  latency_ms: number | null;
};

type Trace = {
  schema_version: string;
  identity: Record<string, unknown>;
  routing: Record<string, unknown>;
  client_input: Record<string, unknown>;
  state: Record<string, unknown>;
  pipeline: TraceStage[];
  publication: Record<string, unknown>;
  latency: Record<string, unknown>;
  diagnostics: Record<string, unknown>;
  trace_sha256: string;
};

const STATUS_STYLES: Record<TraceStage['status'], string> = {
  pass: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  blocked: 'border-red-200 bg-red-50 text-red-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  not_used: 'border-slate-200 bg-slate-50 text-slate-700',
  not_reached: 'border-slate-200 bg-slate-50 text-slate-500',
};

const STAGE_LABELS: Record<string, string> = {
  client_message: 'Сообщение клиента',
  context_integrity: 'Context Integrity',
  project_memory: 'Память проекта / диалога',
  sales_controller: 'Sales Controller',
  engineering_lab: 'Engineering Decision Lab',
  decision_package: 'Decision Package',
  knowledge_sources: 'Knowledge / Evidence',
  verbalization_projection: 'Verbalization Projection',
  executor: 'Qwen / Codex',
  evaluator_raw: 'Evaluator Raw',
  repair: 'Repair',
  evaluator_final: 'Evaluator Final',
  runtime_publication: 'Runtime Publication',
  site_publication: 'Ответ клиенту',
  site_pre_runtime_gate: 'Site pre-Runtime gate',
  runtime_transport: 'Runtime transport',
};

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function TraceSection({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100">
        {json(value)}
      </pre>
    </div>
  );
}

export default function AiTraceViewer({
  turnId,
  onClose,
}: {
  turnId: string;
  onClose: () => void;
}) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [annotations, setAnnotations] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('instruction_leak');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(`/api/admin/ai-widget/trace/${encodeURIComponent(turnId)}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Trace недоступен.');
        return result;
      })
      .then((result) => {
        if (!active) return;
        if (!result.trace) {
          setError('Полный trace уже удалён по retention policy; metadata сохранена.');
          return;
        }
        setTrace(result.trace);
        setAnnotations(result.annotations || []);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Trace недоступен.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [turnId]);

  const leakWarning = useMemo(() => (
    trace?.diagnostics.instruction_leak_warning === true
  ), [trace]);

  const saveAnnotation = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        `/api/admin/ai-widget/trace/${encodeURIComponent(turnId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, note }),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Не удалось сохранить отметку.');
      setAnnotations((current) => [
        ...current,
        { category, note, created_at: new Date().toISOString() },
      ]);
      setNote('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ошибка сохранения.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
      <div className="ml-auto min-h-full w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 rounded-t-3xl bg-slate-950 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                AI_TRACE_VIEWER_V1
              </p>
              <h2 className="mt-1 text-2xl font-black">Диагностика ответа</h2>
              <p className="mt-1 break-all text-xs text-slate-400">Turn {turnId}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold"
            >
              Закрыть
            </button>
          </div>
        </header>

        <div className="grid gap-5 p-5">
          {loading ? <p className="text-sm text-slate-500">Загрузка trace…</p> : null}
          {error ? (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : null}
          {trace ? (
            <>
              {leakWarning ? (
                <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-800">
                  POSSIBLE_INTERNAL_INSTRUCTION_LEAK — служебная формулировка обнаружена в видимом ответе.
                </div>
              ) : null}

              <section className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
                <TraceSection title="Identity / release" value={trace.identity} />
                <TraceSection title="Routing / execution" value={trace.routing} />
                <TraceSection title="Publication" value={trace.publication} />
                <TraceSection title="Latency" value={trace.latency} />
              </section>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-black">Путь ответа</h3>
                  <a
                    href={`/api/admin/ai-widget/trace/${encodeURIComponent(turnId)}/export`}
                    className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white"
                  >
                    Экспорт trace JSON
                  </a>
                </div>
                <div className="mt-4 grid gap-3">
                  {trace.pipeline.map((stage, index) => (
                    <div key={`${stage.name}:${index}`}>
                      {index > 0 ? (
                        <div className="ml-6 h-4 border-l-2 border-slate-300" aria-hidden="true" />
                      ) : null}
                      <details className={`rounded-2xl border p-4 ${STATUS_STYLES[stage.status]}`}>
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-black">
                                {STAGE_LABELS[stage.name] || stage.name}
                              </p>
                              <p className="mt-1 text-sm opacity-80">{stage.summary}</p>
                            </div>
                            <div className="text-right text-xs font-black uppercase">
                              <p>{stage.status}</p>
                              {stage.latency_ms !== null ? <p>{stage.latency_ms} мс</p> : null}
                            </div>
                          </div>
                          {stage.reason_codes.length > 0 ? (
                            <p className="mt-2 break-words font-mono text-xs">
                              {stage.reason_codes.join(' · ')}
                            </p>
                          ) : null}
                        </summary>
                        <div className="mt-4 grid gap-4 border-t border-current/15 pt-4 md:grid-cols-2">
                          <TraceSection title="Input" value={stage.input} />
                          <TraceSection title="Output" value={stage.output} />
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
                <TraceSection title="Client input / supplied history" value={trace.client_input} />
                <TraceSection title="Memory / state / mutations" value={trace.state} />
                <TraceSection title="First appearance / diagnostics" value={trace.diagnostics} />
                <TraceSection title="Trace integrity" value={{
                  schema_version: trace.schema_version,
                  trace_sha256: trace.trace_sha256,
                  chain_of_thought_captured: false,
                }} />
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-black">Пометить ответ как проблемный</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Отметка добавляется отдельно и не изменяет исходный execution trace.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-[240px_minmax(0,1fr)_auto]">
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="factual_error">Фактическая ошибка</option>
                    <option value="bad_recommendation">Плохая рекомендация</option>
                    <option value="forgotten_context">Забытый контекст</option>
                    <option value="repeated_question">Повторный вопрос</option>
                    <option value="bad_wording">Плохая формулировка</option>
                    <option value="instruction_leak">Служебная инструкция</option>
                    <option value="too_long">Слишком длинный</option>
                    <option value="too_short">Слишком короткий</option>
                    <option value="other">Другое</option>
                  </select>
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Комментарий (необязательно)"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveAnnotation()}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Сохранить
                  </button>
                </div>
                {annotations.length > 0 ? (
                  <TraceSection title="Owner annotations" value={annotations} />
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
