import 'server-only';

const DEFAULT_HEARTBEAT_MS = 10_000;
const MIN_HEARTBEAT_MS = 1_000;
const MAX_HEARTBEAT_MS = 15_000;

type StreamFrame =
  | { type: 'processing'; elapsedMs: number }
  | { type: 'pending' }
  | {
      type: 'answer';
      answer: string;
      route: string | null;
      requestId: string | null;
      leadIntent: string | null;
      runtimeSha: string | null;
      traceId: string | null;
      fallback: boolean;
      fallbackReason: string | null;
    }
  | { type: 'error'; message: string };

function heartbeatMs(env: NodeJS.ProcessEnv = process.env) {
  const parsed = Number.parseInt(
    env.AI_WIDGET_RESPONSE_HEARTBEAT_MS ?? '',
    10,
  );
  return Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, MIN_HEARTBEAT_MS), MAX_HEARTBEAT_MS)
    : DEFAULT_HEARTBEAT_MS;
}

function errorMessage(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { message?: unknown };
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim().slice(0, 500);
    }
  } catch {
    // The public error below is intentionally generic.
  }
  return 'Не удалось получить ответ. Попробуйте ещё раз.';
}

export function acceptsAiWidgetProgressStream(request: Request) {
  return request.headers.get('accept')
    ?.toLowerCase()
    .includes('application/x-ndjson') === true;
}

export function streamAiWidgetChatResponse(
  responsePromise: Promise<Response>,
  options: { heartbeatMs?: number; now?: () => number } = {},
) {
  const encoder = new TextEncoder();
  const startedAt = (options.now ?? Date.now)();
  const intervalMs = options.heartbeatMs ?? heartbeatMs();
  let clientClosed = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (frame: StreamFrame) => {
        if (clientClosed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));
      };
      enqueue({ type: 'processing', elapsedMs: 0 });
      interval = setInterval(() => {
        enqueue({
          type: 'processing',
          elapsedMs: Math.max(0, (options.now ?? Date.now)() - startedAt),
        });
      }, intervalMs);

      void responsePromise
        .then(async (response) => {
          const raw = await response.text();
          if (clientClosed) return;
          if (response.status === 202) {
            enqueue({ type: 'pending' });
            return;
          }
          if (!response.ok) {
            enqueue({ type: 'error', message: errorMessage(raw) });
            return;
          }
          const answer = raw.trim();
          if (!answer) {
            enqueue({
              type: 'error',
              message: 'Не удалось получить ответ. Попробуйте ещё раз.',
            });
            return;
          }
          enqueue({
            type: 'answer',
            answer,
            route: response.headers.get('x-ai-widget-route'),
            requestId: response.headers.get('x-ai-widget-request-id'),
            leadIntent: response.headers.get('x-ai-widget-lead-intent'),
            runtimeSha: response.headers.get('x-agent-pilot-runtime-sha'),
            traceId: response.headers.get('x-agent-pilot-trace-id'),
            fallback: response.headers.get('x-ai-widget-fallback') === 'true'
              || response.headers.get('x-agent-pilot-fallback') === 'true',
            fallbackReason: response.headers.get(
              'x-agent-pilot-fallback-reason',
            ),
          });
        })
        .catch(() => {
          enqueue({
            type: 'error',
            message: 'Не удалось получить ответ. Попробуйте ещё раз.',
          });
        })
        .finally(() => {
          if (interval) clearInterval(interval);
          interval = null;
          if (!clientClosed) controller.close();
        });
    },
    cancel() {
      clientClosed = true;
      if (interval) clearInterval(interval);
      interval = null;
      // The Site handler deliberately keeps running so its durable turn can
      // reach answered/error and be recovered by turn id.
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-transform',
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'X-AI-Widget-Progress-Stream': 'v1',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
