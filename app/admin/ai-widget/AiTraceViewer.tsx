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
  knowledge?: Array<Record<string, unknown>>;
  validation?: Record<string, unknown>;
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
  executor: 'Исполнение / Qwen / Codex / deterministic',
  evaluator_raw: 'Evaluator Raw',
  repair: 'Repair',
  evaluator_final: 'Evaluator Final',
  runtime_publication: 'Runtime Publication',
  site_publication: 'Ответ клиенту',
  site_pre_runtime_gate: 'Site pre-Runtime gate',
  runtime_transport: 'Runtime transport',
  agent_knowledge: 'Knowledge / Evidence',
  agent_critic: 'Critic / validation',
  agent_reconsideration: 'Reconsideration',
};

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function asRecords(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(
      item && typeof item === 'object' && !Array.isArray(item),
    ))
    : [];
}

function milliseconds(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value)) : null;
}

function formatMs(value: unknown) {
  const numeric = milliseconds(value);
  if (numeric === null) return 'не измерено';
  return numeric >= 1_000
    ? `${(numeric / 1_000).toFixed(numeric >= 10_000 ? 1 : 2)} с`
    : `${numeric} мс`;
}

function LatencyRow({
  label,
  value,
  maximum,
  tone = 'bg-blue-600',
}: {
  label: string;
  value: unknown;
  maximum: number;
  tone?: string;
}) {
  const numeric = milliseconds(value);
  if (numeric === null) return null;
  const width = maximum > 0 ? Math.max(2, (numeric / maximum) * 100) : 2;
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_minmax(0,1fr)_90px] sm:items-center">
      <p className="truncate text-xs font-bold text-slate-700">{label}</p>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, width)}%` }} />
      </div>
      <p className="text-right text-xs font-black tabular-nums text-slate-700">
        {formatMs(numeric)}
      </p>
    </div>
  );
}

function FactColumn({
  title,
  value,
  tone,
}: {
  title: string;
  value: unknown;
  tone: string;
}) {
  const items = asRecords(value);
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <p className="text-xs font-black uppercase tracking-wide">{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 grid gap-2">
          {items.map((item, index) => (
            <div key={`${String(item.field ?? item.question_id ?? index)}:${index}`} className="rounded-lg bg-white/80 p-2 text-xs">
              <p className="font-black">{String(item.field ?? item.question ?? item.question_id ?? `item ${index + 1}`)}</p>
              <p className="mt-1 break-words text-slate-700">
                {json(item.normalized_value ?? item.raw_value ?? item.value ?? item.status ?? item)}
              </p>
            </div>
          ))}
        </div>
      ) : <p className="mt-2 text-xs opacity-70">Нет изменений</p>}
    </div>
  );
}

function TraceSection({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0 max-w-full">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <pre className="mt-2 max-h-96 min-w-0 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100">
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
  const [copied, setCopied] = useState(false);

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
  const isAgentPilot = trace?.schema_version === 'AGENT_PILOT_TRACE_VIEWER_V1';
  const roleStages = useMemo(() => (
    trace?.pipeline.filter((stage) => stage.name.startsWith('agent_role:')) ?? []
  ), [trace]);
  const maximumLatency = useMemo(() => {
    if (!trace) return 1;
    const values = [
      ...roleStages.map((stage) => milliseconds(stage.latency_ms) ?? 0),
      milliseconds(trace.latency.non_model_residual_ms) ?? 0,
      milliseconds(trace.latency.site_transport_residual_ms) ?? 0,
      milliseconds(trace.latency.queue_ms) ?? 0,
    ];
    return Math.max(1, ...values);
  }, [roleStages, trace]);

  const copyTrace = async () => {
    if (!trace) return;
    await navigator.clipboard.writeText(json(trace));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

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
    <aside className="fixed inset-0 z-50 max-w-full overflow-x-hidden overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
      <div className="ml-auto min-h-full min-w-0 w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 rounded-t-3xl bg-slate-950 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                {isAgentPilot ? 'AGENT PILOT TRACE VIEWER V1' : 'AI_TRACE_VIEWER_V1'}
              </p>
              <h2 className="mt-1 break-words text-xl font-black sm:text-2xl">Диагностика ответа</h2>
              <p className="mt-1 break-all text-xs text-slate-400">Turn {turnId}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold"
            >
              Закрыть
            </button>
          </div>
        </header>

        <div className="grid min-w-0 gap-5 p-5">
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

              {isAgentPilot ? (
                <>
                  <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ['Route', trace.identity.route],
                      ['Runtime', String(trace.identity.runtime_sha ?? '').slice(0, 12)],
                      ['Trace ID', trace.identity.trace_id],
                      ['Total', formatMs(trace.latency.site_total_ms)],
                      ['Status', trace.publication.status],
                      ['Fallback', trace.routing.fallback === true ? 'true' : 'false'],
                      ['Codex calls', trace.routing.codex_calls ?? roleStages.length],
                      ['Slowest', trace.latency.slowest_role ?? 'не измерено'],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="min-w-0 rounded-xl bg-white p-3 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{String(label)}</p>
                        <p className="mt-1 break-all text-sm font-black text-slate-950">{String(value ?? '—')}</p>
                      </div>
                    ))}
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-black">Где ушло время</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Измеренные роли показаны отдельно; routing/retrieval без отдельного таймера остаются в residual.
                        </p>
                      </div>
                      <p className="text-sm font-black tabular-nums text-slate-950">
                        Total: {formatMs(trace.latency.site_total_ms)}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {roleStages.map((stage, index) => (
                        <LatencyRow
                          key={`${stage.name}:${index}`}
                          label={`${index + 1}. ${stage.name.replace('agent_role:', '')}`}
                          value={stage.latency_ms}
                          maximum={maximumLatency}
                        />
                      ))}
                      <LatencyRow
                        label="Non-model residual"
                        value={trace.latency.non_model_residual_ms}
                        maximum={maximumLatency}
                        tone="bg-slate-500"
                      />
                      <LatencyRow
                        label="Site / transport residual"
                        value={trace.latency.site_transport_residual_ms}
                        maximum={maximumLatency}
                        tone="bg-violet-500"
                      />
                      <LatencyRow
                        label="Queue"
                        value={trace.latency.queue_ms}
                        maximum={maximumLatency}
                        tone="bg-amber-500"
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-lg font-black">Call graph</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Agent Pilot call graph">
                      {roleStages.length > 0 ? roleStages.map((stage, index) => (
                        <div key={`${stage.name}:graph:${index}`} className="contents">
                          {index > 0 ? <span className="font-black text-slate-400">→</span> : null}
                          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
                            <p className="text-xs font-black text-blue-950">{stage.name.replace('agent_role:', '')}</p>
                            <p className="mt-1 text-[10px] text-blue-700">{formatMs(stage.latency_ms)}</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-slate-500">Model roles не вызывались.</p>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full bg-slate-100 px-3 py-1">Critic: {trace.routing.critic_used === true ? 'used' : 'not used'}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">Reconsideration: {trace.routing.reconsideration_used === true ? 'used' : 'not used'}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">Duplicate prevented: {trace.routing.duplicate_execution_prevented === true ? 'yes' : 'no'}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">Durable result reused: {trace.routing.durable_result_reused === true ? 'yes' : 'no'}</span>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-black">Knowledge / evidence</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${
                        trace.diagnostics.authorization_status === 'pass'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        Authorization {String(trace.diagnostics.authorization_status ?? 'unknown').toUpperCase()}
                      </span>
                    </div>
                    {(trace.knowledge ?? []).length > 0 ? (
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {(trace.knowledge ?? []).map((evidence, index) => {
                          const authorized = evidence.authorization === 'pass';
                          return (
                            <article key={`${String(evidence.knowledge_id)}:${index}`} className={`rounded-xl border p-3 ${authorized ? 'border-emerald-200 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="break-all text-xs font-black">{String(evidence.knowledge_id ?? 'knowledge id unavailable')}</p>
                                  <p className="mt-1 break-all text-[11px] text-slate-600">{String(evidence.source_id ?? 'source unavailable')}</p>
                                </div>
                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase">{authorized ? 'PASS' : 'FAIL'}</span>
                              </div>
                              <p className="mt-2 text-xs text-slate-700">{String(evidence.excerpt ?? '')}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                                <span>{String(evidence.authority_class ?? 'authority unknown')}</span>
                                <span>customer_facing={String(evidence.customer_facing)}</span>
                                <span>used={String(evidence.used_in_final)}</span>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : <p className="mt-3 text-sm text-slate-500">Knowledge не требовался или не был выбран.</p>}
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-lg font-black">Object Card · до → после</h3>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      <FactColumn
                        title="Confirmed / direct"
                        value={asRecord(asRecord(trace.state.changes).confirmed_direct).added}
                        tone="border-emerald-200 bg-emerald-50 text-emerald-900"
                      />
                      <FactColumn
                        title="Inferred"
                        value={asRecord(asRecord(trace.state.changes).inferred).added}
                        tone="border-amber-200 bg-amber-50 text-amber-900"
                      />
                      <FactColumn
                        title="Open questions"
                        value={asRecord(asRecord(trace.state.changes).open_questions).added}
                        tone="border-blue-200 bg-blue-50 text-blue-900"
                      />
                    </div>
                    <details className="mt-3 rounded-xl bg-slate-50 p-3">
                      <summary className="cursor-pointer text-xs font-black">Полное структурированное состояние до / после</summary>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <TraceSection title="Before" value={trace.state.object_card_before} />
                        <TraceSection title="After" value={trace.state.object_card_after} />
                      </div>
                    </details>
                  </section>

                  <section className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-black">Critic / validation</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${
                        trace.validation?.status === 'pass'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>{String(trace.validation?.status ?? 'unknown').toUpperCase()}</span>
                    </div>
                    {trace.routing.reconsideration_used === true ? (
                      <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm font-bold text-violet-900">
                        Initial Orchestrator → Critic finding → Reconsideration → Final answer
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <TraceSection title="Structured findings" value={trace.validation?.critic_findings ?? {}} />
                      <TraceSection title="Claim plan / obligations" value={{
                        claim_plan: trace.validation?.claim_plan ?? [],
                        answer_obligations: trace.validation?.answer_obligations ?? [],
                      }} />
                    </div>
                  </section>
                </>
              ) : null}

              <section className="grid min-w-0 gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
                <TraceSection title="Identity / release" value={trace.identity} />
                <TraceSection title="Routing / execution" value={trace.routing} />
                <TraceSection title="Publication" value={trace.publication} />
                <TraceSection title="Latency" value={trace.latency} />
              </section>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-black">Путь ответа</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyTrace()}
                      className="rounded-xl border border-blue-700 px-4 py-2 text-sm font-bold text-blue-800"
                    >
                      {copied ? 'JSON скопирован' : 'Скопировать JSON'}
                    </button>
                    <a
                      href={`/api/admin/ai-widget/trace/${encodeURIComponent(turnId)}/export`}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white"
                    >
                      Скачать JSON
                    </a>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {trace.pipeline.map((stage, index) => (
                    <div key={`${stage.name}:${index}`}>
                      {index > 0 ? (
                        <div className="ml-6 h-4 border-l-2 border-slate-300" aria-hidden="true" />
                      ) : null}
                      <details className={`min-w-0 overflow-hidden rounded-2xl border p-4 ${STATUS_STYLES[stage.status]}`}>
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-black">
                                {STAGE_LABELS[stage.name]
                                  || (stage.name.startsWith('agent_role:')
                                    ? stage.name.replace('agent_role:', '')
                                    : stage.name)}
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

              <section className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
                <TraceSection title="Client input / supplied history" value={trace.client_input} />
                <TraceSection title="Memory / state / mutations" value={trace.state} />
                <TraceSection title="First appearance / diagnostics" value={trace.diagnostics} />
                <TraceSection title="Trace integrity" value={{
                  schema_version: trace.schema_version,
                  trace_sha256: trace.trace_sha256,
                  chain_of_thought_captured: false,
                }} />
              </section>

              <details className="rounded-2xl border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-black">
                  Показать raw trace конкретного хода
                </summary>
                <div className="mt-4">
                  <TraceSection title="Sanitized raw JSON" value={trace} />
                </div>
              </details>

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
