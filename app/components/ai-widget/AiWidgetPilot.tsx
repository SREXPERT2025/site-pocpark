'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckCircle2,
  ClipboardList,
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
import {
  dispatchAiPromoEvent,
  type AiPromoEventParams,
} from '@/app/lib/analytics-events';
import { AI_WIDGET_MAX_MESSAGE_LENGTH } from '@/app/lib/ai-widget-pilot';
import { aiWidgetMessageParts } from '@/app/lib/ai-widget-links';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelVisible?: boolean;
};

type LeadStep =
  | 'idle'
  | 'name'
  | 'contact'
  | 'object'
  | 'task'
  | 'review'
  | 'submitting'
  | 'submitted';

type LeadDraft = {
  name: string;
  contact: string;
  objectDescription: string;
  taskDescription: string;
};

const emptyLeadDraft: LeadDraft = {
  name: '',
  contact: '',
  objectDescription: '',
  taskDescription: '',
};

function greetingFor(runtimeMode: 'preview' | 'production'): UiMessage {
  return {
    id: 'greeting',
    role: 'assistant',
    content: runtimeMode === 'production'
      ? 'Здравствуйте! Я AI-консультант РОСПАРК. Помогу разобраться в возможностях парковочной системы и подобрать подходящий сценарий для вашего объекта.'
      : 'Здравствуйте! Я тестовый AI-консультант РОСПАРК. Помогу разобраться в возможностях парковочной системы. Не вводите реальные персональные данные.',
  };
}

const quickQuestions = [
  'Для каких объектов подходит система?',
  'Как работает гостевой доступ?',
  'От чего зависит стоимость проекта?',
] as const;

type AiWidgetOpenDetail = {
  landingVariant?: string;
  sourceSection?: string;
  selectedFunctions?: unknown;
  selectedProblem?: unknown;
  prompt?: unknown;
  sessionId?: unknown;
};

function promoAttributionFrom(detail: AiWidgetOpenDetail): AiPromoEventParams | null {
  const isPuzzle2 = detail.landingVariant === 'puzzle2'
    && detail.sourceSection === 'ai_midpage';
  const isParkovka = detail.landingVariant === 'parkovka'
    && detail.sourceSection === 'ai_after_problem_selector';
  if (!isPuzzle2 && !isParkovka) return null;

  const selectedFunctions = Array.isArray(detail.selectedFunctions)
    ? detail.selectedFunctions
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12)
    : [];

  return {
    landing_variant: isPuzzle2 ? 'puzzle2' : 'parkovka',
    source_section: isPuzzle2
      ? 'ai_midpage'
      : 'ai_after_problem_selector',
    selected_functions: selectedFunctions,
    selected_problem: typeof detail.selectedProblem === 'string'
      ? detail.selectedProblem.trim()
      : undefined,
    session_id: typeof detail.sessionId === 'string'
      ? detail.sessionId.trim()
      : undefined,
  };
}

function MessageText({ content }: { content: string }) {
  return (
    <>
      {aiWidgetMessageParts(content).map((part, index) => {
        if (part.type === 'text') {
          return <span key={`${index}-${part.value}`}>{part.value}</span>;
        }
        if (part.type === 'strong') {
          return <strong key={`${index}-${part.value}`}>{part.value}</strong>;
        }
        return (
          <span key={`${index}-${part.href}-${part.label}`}>
            {part.href.startsWith('/') ? (
              <Link
                href={part.href}
                className="font-semibold underline decoration-2 underline-offset-2"
              >
                {part.label}
              </Link>
            ) : (
              <a
                href={part.href}
                className="font-semibold underline decoration-2 underline-offset-2"
              >
                {part.label}
              </a>
            )}
          </span>
        );
      })}
    </>
  );
}

export default function AiWidgetPilot() {
  const pathname = usePathname();
  const [isEnabled, setIsEnabled] = useState(false);
  const [runtimeMode, setRuntimeMode] = useState<
    'preview' | 'production'
  >('preview');
  const [handoffMode, setHandoffMode] = useState<
    'off' | 'test' | 'live'
  >('off');
  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(true);
  const [messages, setMessages] = useState<UiMessage[]>([
    greetingFor('preview'),
  ]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [leadStep, setLeadStep] = useState<LeadStep>('idle');
  const [leadDraft, setLeadDraft] = useState<LeadDraft>(emptyLeadDraft);
  const [leadConsent, setLeadConsent] = useState(false);
  const [showLeadOffer, setShowLeadOffer] = useState(false);
  const [leadResult, setLeadResult] = useState<{
    publicId: string;
    maxPreview?: string;
  } | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef('');
  const submissionIdRef = useRef('');
  const promoAttributionRef = useRef<AiPromoEventParams | null>(null);
  const promoFirstMessageTrackedRef = useRef(false);
  const pendingPromptRef = useRef('');

  const isHidden = pathname.startsWith('/admin') || pathname === '/v4-1';

  useEffect(() => {
    if (isHidden) return;
    const controller = new AbortController();
    void fetch('/api/ai-widget/status', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => (
        response.ok
          ? response.json() as Promise<{
              enabled?: boolean;
              runtimeMode?: 'preview' | 'production';
              handoffMode?: 'off' | 'test' | 'live';
              loggingEnabled?: boolean;
            }>
          : {
              enabled: false,
              runtimeMode: 'preview' as const,
              handoffMode: 'off' as const,
              loggingEnabled: false,
            }
      ))
      .then((result) => {
        setIsEnabled(result.enabled === true);
        const nextRuntimeMode = result.runtimeMode === 'production'
          ? 'production'
          : 'preview';
        setRuntimeMode(nextRuntimeMode);
        setHandoffMode(
          result.handoffMode === 'test' || result.handoffMode === 'live'
            ? result.handoffMode
            : 'off',
        );
        setLoggingEnabled(result.loggingEnabled === true);
        setMessages((current) => (
          current.length === 1 && current[0]?.id === 'greeting'
            ? [greetingFor(nextRuntimeMode)]
            : current
        ));
      })
      .catch(() => {
        setIsEnabled(false);
        setHandoffMode('off');
        setLoggingEnabled(false);
      });
    return () => controller.abort();
  }, [isHidden]);

  useEffect(() => {
    if (!isOpen) return;
    if (pendingPromptRef.current) {
      setDraft(pendingPromptRef.current);
      pendingPromptRef.current = '';
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      closeRef.current?.focus();
    }
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
    if (isHidden || !isEnabled) return;
    const openFromPage = (event: Event) => {
      const detail = event instanceof CustomEvent
        ? event.detail as AiWidgetOpenDetail | undefined
        : undefined;
      const attribution = detail
        ? promoAttributionFrom(detail)
        : null;
      promoAttributionRef.current = attribution;
      promoFirstMessageTrackedRef.current = false;
      pendingPromptRef.current = typeof detail?.prompt === 'string'
        ? detail.prompt.trim().slice(0, AI_WIDGET_MAX_MESSAGE_LENGTH)
        : '';
      if (attribution) {
        dispatchAiPromoEvent('ai_chat_open', attribution);
      }
      setShowInvite(false);
      setIsOpen(true);
    };
    window.addEventListener('rospark:open-ai-widget', openFromPage);
    return () => window.removeEventListener(
      'rospark:open-ai-widget',
      openFromPage,
    );
  }, [isEnabled, isHidden]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isSending]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (isHidden || !isEnabled) return null;

  const sessionId = () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const stored = window.sessionStorage.getItem(
      'rospark_ai_widget_session_id',
    );
    const value = (
      stored
      && /^[a-z0-9][a-z0-9._:-]{15,127}$/i.test(stored)
    )
      ? stored
      : crypto.randomUUID();
    window.sessionStorage.setItem(
      'rospark_ai_widget_session_id',
      value,
    );
    sessionIdRef.current = value;
    return value;
  };

  const resetLeadFlow = () => {
    setLeadStep('idle');
    setLeadDraft(emptyLeadDraft);
    setLeadConsent(false);
    setShowLeadOffer(false);
    setLeadResult(null);
    submissionIdRef.current = '';
  };

  const openWidget = () => {
    setShowInvite(false);
    setIsOpen(true);
    sessionId();
  };

  const closeWidget = () => {
    setIsOpen(false);
    launcherRef.current?.focus();
  };

  const clearChat = () => {
    abortRef.current?.abort();
    const nextSessionId = crypto.randomUUID();
    window.sessionStorage.setItem(
      'rospark_ai_widget_session_id',
      nextSessionId,
    );
    sessionIdRef.current = nextSessionId;
    setMessages([greetingFor(runtimeMode)]);
    setDraft('');
    setError('');
    setIsSending(false);
    promoAttributionRef.current = null;
    promoFirstMessageTrackedRef.current = false;
    pendingPromptRef.current = '';
    resetLeadFlow();
  };

  const appendLeadExchange = (
    userContent: string | null,
    assistantContent: string,
  ) => {
    setMessages((current) => {
      const next = [...current];
      if (userContent) {
        next.push({
          id: crypto.randomUUID(),
          role: 'user',
          content: userContent,
          modelVisible: false,
        });
      }
      next.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        modelVisible: false,
      });
      return next.slice(-20);
    });
  };

  const startLeadFlow = () => {
    if (
      handoffMode === 'off'
      || !loggingEnabled
      || leadStep !== 'idle'
    ) {
      return;
    }
    setShowLeadOffer(false);
    setLeadDraft(emptyLeadDraft);
    setLeadConsent(false);
    setLeadResult(null);
    submissionIdRef.current = crypto.randomUUID();
    setLeadStep('name');
    appendLeadExchange(
      null,
      runtimeMode === 'production'
        ? 'Хорошо, оформим обращение. Как к вам обращаться?'
        : 'Начинаем тестовую заявку. Используйте только вымышленные данные. Как к вам обращаться?',
    );
  };

  const handleLeadAnswer = (text: string) => {
    const content = text.trim();
    if (!content) return;
    if (leadStep === 'name') {
      if (content.length < 2) {
        setError(runtimeMode === 'production'
          ? 'Укажите имя не короче двух символов.'
          : 'Укажите тестовое имя не короче двух символов.');
        return;
      }
      setLeadDraft((current) => ({ ...current, name: content }));
      setLeadStep('contact');
      setDraft('');
      setError('');
      appendLeadExchange(
        content,
        runtimeMode === 'production'
          ? 'Укажите номер телефона для связи.'
          : 'Укажите тестовый телефон. Реальные данные на стенде не вводите.',
      );
      return;
    }
    if (leadStep === 'contact') {
      if (content.length < 3) {
        setError(runtimeMode === 'production'
          ? 'Укажите номер телефона.'
          : 'Укажите тестовый контакт.');
        return;
      }
      setLeadDraft((current) => ({ ...current, contact: content }));
      setLeadStep('object');
      setDraft('');
      setError('');
      appendLeadExchange(
        content,
        'Какой объект рассматривается: бизнес-центр, ЖК, предприятие, платная парковка или другой вариант?',
      );
      return;
    }
    if (leadStep === 'object') {
      if (content.length < 3) {
        setError(runtimeMode === 'production'
          ? 'Кратко опишите объект.'
          : 'Кратко опишите тестовый объект.');
        return;
      }
      setLeadDraft((current) => ({
        ...current,
        objectDescription: content,
      }));
      setLeadStep('task');
      setDraft('');
      setError('');
      appendLeadExchange(
        content,
        'Что требуется автоматизировать или уточнить? Опишите задачу одной-двумя фразами.',
      );
      return;
    }
    if (leadStep === 'task') {
      if (content.length < 5) {
        setError('Добавьте немного больше информации о задаче.');
        return;
      }
      setLeadDraft((current) => ({
        ...current,
        taskDescription: content,
      }));
      setLeadStep('review');
      setDraft('');
      setError('');
      appendLeadExchange(
        content,
        runtimeMode === 'production'
          ? 'Заявка подготовлена. Проверьте данные и подтвердите согласие на их обработку.'
          : 'Тестовая карточка подготовлена. Проверьте данные и подтвердите, что они вымышленные.',
      );
    }
  };

  const submitLead = async () => {
    if (
      leadStep !== 'review'
      || !leadConsent
      || !submissionIdRef.current
    ) {
      return;
    }
    setLeadStep('submitting');
    setError('');
    try {
      const response = await fetch('/api/ai-widget/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId(),
          submissionId: submissionIdRef.current,
          sourcePage: pathname,
          ...leadDraft,
          consent: true,
        }),
      });
      const result = await response.json().catch(() => null) as {
        message?: string;
        publicId?: string;
        maxPreview?: string;
      } | null;
      if (!response.ok || !result?.publicId) {
        throw new Error(
          result?.message || 'Не удалось сохранить заявку.',
        );
      }
      setLeadResult({
        publicId: result.publicId,
        maxPreview: result.maxPreview || undefined,
      });
      setLeadStep('submitted');
      if (promoAttributionRef.current) {
        dispatchAiPromoEvent(
          'ai_lead_handoff',
          {
            ...promoAttributionRef.current,
            handoff_to_lead: true,
          },
        );
      }
      appendLeadExchange(
        null,
        runtimeMode === 'production'
          ? `Заявка ${result.publicId} принята. Специалист РОСПАРК свяжется с вами по указанному номеру.`
          : `Тестовая заявка ${result.publicId} сохранена в журнале. На Mac Studio она не отправлялась в MAX и не попала в рабочий реестр.`,
      );
    } catch (caught) {
      setLeadStep('review');
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось сохранить заявку.',
      );
    }
  };

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isSending) return;
    if (
      leadStep === 'name'
      || leadStep === 'contact'
      || leadStep === 'object'
      || leadStep === 'task'
    ) {
      handleLeadAnswer(content);
      return;
    }
    if (
      leadStep === 'review'
      || leadStep === 'submitting'
      || leadStep === 'submitted'
    ) {
      return;
    }
    if (
      promoAttributionRef.current
      && !promoFirstMessageTrackedRef.current
    ) {
      promoFirstMessageTrackedRef.current = true;
      dispatchAiPromoEvent(
        'ai_first_message_sent',
        promoAttributionRef.current,
      );
    }
    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };
    const displayHistory = [...messages, userMessage].slice(-20);
    const modelHistory = [
      ...messages.filter((message) => message.modelVisible !== false),
      userMessage,
    ].slice(-12);
    const assistantId = crypto.randomUUID();
    setMessages([
      ...displayHistory,
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setDraft('');
    setError('');
    setIsSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/ai-widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId(),
          turnId: userMessage.id,
          sourcePage: pathname,
          messages: modelHistory.map(({ role, content: messageContent }) => ({
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
      const leadIntent = response.headers.get(
        'x-ai-widget-lead-intent',
      );
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
      if (
        (leadIntent === 'test' || leadIntent === 'live')
        && handoffMode !== 'off'
        && loggingEnabled
      ) {
        setShowLeadOffer(true);
      }
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

  const inputPlaceholder = leadStep === 'name'
    ? runtimeMode === 'production'
      ? 'Введите имя…'
      : 'Введите тестовое имя…'
    : leadStep === 'contact'
      ? runtimeMode === 'production'
        ? 'Введите телефон…'
        : 'Введите тестовый контакт…'
      : leadStep === 'object'
        ? 'Опишите объект…'
        : leadStep === 'task'
          ? 'Опишите задачу…'
          : 'Напишите вопрос…';
  const inputDisabled = (
    isSending
    || leadStep === 'review'
    || leadStep === 'submitting'
    || leadStep === 'submitted'
  );

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
              <p className="mt-1">
                {runtimeMode === 'production'
                  ? 'Спросите AI-консультанта РОСПАРК.'
                  : 'Спросите тестового AI-консультанта.'}
              </p>
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
                  {runtimeMode === 'production'
                    ? 'Онлайн-консультация'
                    : 'Закрытый тест'}
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
                    {message.content ? (
                      <MessageText content={message.content} />
                    ) : (
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
              {showLeadOffer && leadStep === 'idle' ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs leading-5 text-blue-950">
                    {runtimeMode === 'production'
                      ? 'Передать задачу специалисту РОСПАРК?'
                      : 'Хотите проверить, как AI-виджет собирает обращение для отдела продаж?'}
                  </p>
                  <button
                    type="button"
                    onClick={startLeadFlow}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <ClipboardList size={15} aria-hidden="true" />
                    {runtimeMode === 'production'
                      ? 'Оставить заявку'
                      : 'Оформить тестовую заявку'}
                  </button>
                </div>
              ) : null}
              {leadStep === 'review' || leadStep === 'submitting' ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-slate-800">
                  <p className="font-bold text-slate-950">
                    {runtimeMode === 'production'
                      ? 'Проверьте заявку'
                      : 'ТЕСТ — проверьте карточку'}
                  </p>
                  <dl className="mt-3 grid gap-2">
                    <div>
                      <dt className="font-semibold">Имя</dt>
                      <dd>{leadDraft.name}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Контакт</dt>
                      <dd>{leadDraft.contact}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Объект</dt>
                      <dd>{leadDraft.objectDescription}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Задача</dt>
                      <dd>{leadDraft.taskDescription}</dd>
                    </div>
                  </dl>
                  <label className="mt-4 flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={leadConsent}
                      onChange={(event) => (
                        setLeadConsent(event.target.checked)
                      )}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      disabled={leadStep === 'submitting'}
                    />
                    <span>
                      {runtimeMode === 'production' ? (
                        <>
                          Даю{' '}
                          <Link
                            href="/soglasie-na-obrabotku-personalnyh-dannyh"
                            target="_blank"
                            className="font-semibold text-blue-800 underline"
                          >
                            согласие на обработку персональных данных
                          </Link>
                          {' '}для обработки обращения и связи со мной.
                        </>
                      ) : (
                        'Подтверждаю, что указаны только вымышленные тестовые данные.'
                      )}
                    </span>
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void submitLead()}
                      disabled={
                        !leadConsent
                        || leadStep === 'submitting'
                      }
                      className="rounded-xl bg-blue-700 px-3 py-2 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {leadStep === 'submitting'
                        ? 'Отправляю…'
                        : runtimeMode === 'production'
                          ? 'Отправить заявку'
                          : 'Создать тестовую заявку'}
                    </button>
                    <button
                      type="button"
                      onClick={resetLeadFlow}
                      disabled={leadStep === 'submitting'}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              ) : null}
              {leadStep === 'submitted' && leadResult ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-slate-800">
                  <p className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 size={17} aria-hidden="true" />
                    {runtimeMode === 'production'
                      ? `${leadResult.publicId} принята`
                      : `${leadResult.publicId} сохранена`}
                  </p>
                  {leadResult.maxPreview ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer font-semibold text-blue-800">
                        Показать будущий текст для MAX
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-[11px] leading-5">
                        {leadResult.maxPreview}
                      </pre>
                    </details>
                  ) : null}
                  <button
                    type="button"
                    onClick={resetLeadFlow}
                    className="mt-3 rounded-xl border border-emerald-300 bg-white px-3 py-2 font-semibold text-emerald-900"
                  >
                    Продолжить диалог
                  </button>
                </div>
              ) : null}
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
                ref={inputRef}
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
                placeholder={inputPlaceholder}
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={inputDisabled}
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
                  disabled={!draft.trim() || inputDisabled}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  aria-label="Отправить вопрос"
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              )}
            </form>
            <p className="mt-2 text-center text-[10px] leading-4 text-slate-500">
              {runtimeMode === 'production' ? (
                <>
                  Сообщения обрабатываются для подготовки ответа.{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="underline"
                  >
                    Политика обработки данных
                  </Link>
                </>
              ) : (
                'Тестовый режим · диалог хранится до 7 дней · не вводите реальные персональные данные.'
              )}
            </p>
          </footer>
        </section>
      )}
    </>
  );
}
