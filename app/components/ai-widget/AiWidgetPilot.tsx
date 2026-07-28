'use client';

import { usePathname } from 'next/navigation';
import {
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AI_WIDGET_MAX_MESSAGE_LENGTH } from '@/app/lib/ai-widget-pilot';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const greeting: UiMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    'Здравствуйте! Я тестовый AI-консультант РОСПАРК. Помогу разобраться в возможностях парковочной системы. Не вводите реальные персональные данные.',
};

const quickQuestions = [
  'Для каких объектов подходит система?',
  'Как работает гостевой доступ?',
  'От чего зависит стоимость проекта?',
] as const;

export default function AiWidgetPilot() {
  const pathname = usePathname();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(true);
  const [messages, setMessages] = useState<UiMessage[]>([greeting]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isHidden = pathname.startsWith('/admin');

  useEffect(() => {
    if (isHidden) return;
    const controller = new AbortController();
    void fetch('/api/demo/ai-widget/status', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => (
        response.ok
          ? response.json() as Promise<{ enabled?: boolean }>
          : { enabled: false }
      ))
      .then((result) => setIsEnabled(result.enabled === true))
      .catch(() => setIsEnabled(false));
    return () => controller.abort();
  }, [isHidden]);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isSending]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (isHidden || !isEnabled) return null;

  const openWidget = () => {
    setShowInvite(false);
    setIsOpen(true);
  };

  const closeWidget = () => {
    setIsOpen(false);
    launcherRef.current?.focus();
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([greeting]);
    setDraft('');
    setError('');
    setIsSending(false);
  };

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isSending) return;
    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };
    const history = [...messages, userMessage].slice(-12);
    const assistantId = crypto.randomUUID();
    setMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);
    setDraft('');
    setError('');
    setIsSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/demo/ai-widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePage: pathname,
          messages: history.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Не удалось получить ответ.');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages((current) => current.map((message) => (
          message.id === assistantId
            ? { ...message, content: answer }
            : message
        )));
      }
      if (!answer.trim()) throw new Error('Получен пустой ответ.');
    } catch (caught) {
      if (controller.signal.aborted) {
        setMessages((current) => current.filter((message) => (
          message.id !== assistantId || message.content.trim()
        )));
      } else {
        setMessages((current) => current.filter((message) => message.id !== assistantId));
        setError(
          caught instanceof Error
            ? caught.message
            : 'AI-консультант временно недоступен.',
        );
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsSending(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-5 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-end gap-3 sm:bottom-6 sm:right-6">
          {showInvite && (
            <div className="relative max-w-64 rounded-2xl border border-blue-100 bg-white p-4 pr-9 text-sm leading-5 text-slate-700 shadow-xl">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="absolute right-2 top-2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                aria-label="Скрыть приглашение"
              >
                <X size={15} aria-hidden="true" />
              </button>
              <p className="font-semibold text-slate-950">Есть вопрос о парковке?</p>
              <p className="mt-1">Спросите тестового AI-консультанта.</p>
            </div>
          )}
          <button
            ref={launcherRef}
            type="button"
            onClick={openWidget}
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white shadow-xl transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label="Открыть AI-консультанта"
            aria-expanded="false"
            aria-controls="rospark-ai-widget-panel"
          >
            <MessageCircle size={25} aria-hidden="true" />
          </button>
        </div>
      )}

      {isOpen && (
        <section
          id="rospark-ai-widget-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="rospark-ai-widget-title"
          className="fixed inset-x-3 bottom-3 top-[122px] z-[1200] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(720px,calc(100vh-7rem))] sm:w-[410px]"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 bg-slate-950 px-5 py-4 text-white">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex rounded-xl bg-blue-600 p-2">
                <Sparkles size={19} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300">
                  Закрытый тест
                </p>
                <h2 id="rospark-ai-widget-title" className="mt-1 text-base font-bold">
                  AI-консультант РОСПАРК
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label="Очистить диалог"
              >
                <RotateCcw size={18} aria-hidden="true" />
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={closeWidget}
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label="Свернуть AI-консультанта"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-5" aria-live="polite">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-blue-700 text-white'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    {message.content || (
                      <span
                        className="inline-flex items-center gap-2"
                        role="status"
                        aria-label="AI-консультант готовит ответ"
                      >
                        <span className="text-xs font-semibold text-slate-600">
                          Готовлю ответ
                        </span>
                        <span className="inline-flex items-center gap-1" aria-hidden="true">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-300ms] motion-reduce:animate-none" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-150ms] motion-reduce:animate-none" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-600 motion-reduce:animate-none" />
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {messages.length === 1 && (
                <div className="grid gap-2 pt-2">
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendMessage(question)}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-semibold leading-5 text-blue-900 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white p-4">
            {error && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-700" role="alert">
                {error}
              </p>
            )}
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <label htmlFor="rospark-ai-widget-message" className="sr-only">
                Ваш вопрос
              </label>
              <textarea
                id="rospark-ai-widget-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (draft.trim()) void sendMessage(draft);
                  }
                }}
                maxLength={AI_WIDGET_MAX_MESSAGE_LENGTH}
                rows={1}
                placeholder="Напишите вопрос…"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={isSending}
              />
              {isSending ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white transition hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600"
                  aria-label="Остановить ответ"
                >
                  <Square size={17} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  aria-label="Отправить вопрос"
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              )}
            </form>
            <p className="mt-2 text-center text-[10px] leading-4 text-slate-500">
              Тестовый режим. Не вводите реальные персональные данные.
            </p>
          </footer>
        </section>
      )}
    </>
  );
}
