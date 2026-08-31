'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  RotateCcw,
  Send,
  Square,
  X,
} from 'lucide-react';
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  dispatchAiPromoEvent,
  type AiPromoEventParams,
} from '@/app/lib/analytics-events';
import {
  AI_WIDGET_MAX_MESSAGE_LENGTH,
  aiWidgetPageContextFromAttribution,
} from '@/app/lib/ai-widget-pilot';
import { aiWidgetMessageParts } from '@/app/lib/ai-widget-links';
import {
  AI_WIDGET_ATTENTION_DELAY_MS,
  AI_WIDGET_ATTENTION_PULSE_MS,
  AI_WIDGET_ATTENTION_SESSION_KEY,
  aiWidgetWaitingStageFor,
} from './ai-widget-ux';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelVisible?: boolean;
};

type ChatResult = {
  answer: string;
  leadIntent: string | null;
  pending: boolean;
};

type ProgressFrame = {
  type?: unknown;
  answer?: unknown;
  leadIntent?: unknown;
  message?: unknown;
};

const OWNER_RECOVERY_POLL_MS = 2_000;
const OWNER_RECOVERY_DEADLINE_MS = 330_000;

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

function greetingFor(): UiMessage {
  return {
    id: 'greeting',
    role: 'assistant',
    content: 'Здравствуйте! Помогу разобраться с автоматизацией парковки: доступом, шлагбаумами, оплатой, оборудованием или модернизацией существующей системы. Опишите вашу задачу своими словами.',
  };
}

const quickQuestions = [
  'Подобрать систему для моего объекта',
  'Нужен шлагбаум — с чего начать?',
  'Как организовать доступ сотрудников и гостей?',
  'Хочу модернизировать существующую парковку',
] as const;

type AiWidgetOpenDetail = {
  landingVariant?: string;
  sourceSection?: string;
  selectedFunctions?: unknown;
  selectedProblem?: unknown;
  prompt?: unknown;
  sessionId?: unknown;
};

function landingVariantForPathname(
  pathname: string,
): AiPromoEventParams['landing_variant'] {
  if (pathname === '/parkovka') return 'parkovka';
  if (pathname === '/puzzle2' || pathname === '/parkovka-pod-klyuch') {
    return 'puzzle2';
  }
  return undefined;
}

function launcherAttribution(
  pathname: string,
  sessionId: string,
): AiPromoEventParams {
  return {
    landing_variant: landingVariantForPathname(pathname),
    source_section: 'floating_launcher',
    source_page: pathname,
    session_id: sessionId,
  };
}

function promoAttributionFrom(
  detail: AiWidgetOpenDetail,
  pathname: string,
  fallbackSessionId: string,
): AiPromoEventParams | null {
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
    source_page: pathname,
    session_id: typeof detail.sessionId === 'string'
      ? detail.sessionId.trim()
      : fallbackSessionId,
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

function updateAssistantMessage(
  setter: React.Dispatch<React.SetStateAction<UiMessage[]>>,
  assistantId: string,
  answer: string,
) {
  setter((current) => current.map((message) => (
    message.id === assistantId
      ? { ...message, content: answer }
      : message
  )));
}

async function readChatResult(
  response: Response,
  onAnswer: (answer: string) => void,
): Promise<ChatResult> {
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null) as {
      message?: unknown;
    } | null;
    throw new Error(
      typeof body?.message === 'string'
        ? body.message
        : 'Не удалось получить ответ.',
    );
  }
  const streamed = response.headers.get('content-type')
    ?.toLowerCase()
    .includes('application/x-ndjson') === true;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  if (!streamed) {
    let answer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      answer += decoder.decode(value, { stream: true });
      onAnswer(answer);
    }
    return {
      answer: answer.trim(),
      leadIntent: response.headers.get('x-ai-widget-lead-intent'),
      pending: false,
    };
  }

  let buffer = '';
  let result: ChatResult = { answer: '', leadIntent: null, pending: false };
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = done ? '' : lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const frame = JSON.parse(line) as ProgressFrame;
      if (frame.type === 'processing') continue;
      if (frame.type === 'pending') {
        result = { ...result, pending: true };
        continue;
      }
      if (frame.type === 'error') {
        throw new Error(
          typeof frame.message === 'string'
            ? frame.message
            : 'Не удалось получить ответ.',
        );
      }
      if (frame.type === 'answer' && typeof frame.answer === 'string') {
        result = {
          answer: frame.answer.trim(),
          leadIntent: typeof frame.leadIntent === 'string'
            ? frame.leadIntent
            : null,
          pending: false,
        };
        onAnswer(result.answer);
      }
    }
    if (done) break;
  }
  return result;
}

function recoveryDelay(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, OWNER_RECOVERY_POLL_MS);
    const abort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
  });
}

async function recoverOwnerTurn(
  sessionId: string,
  turnId: string,
  signal: AbortSignal,
) {
  const deadline = Date.now() + OWNER_RECOVERY_DEADLINE_MS;
  while (Date.now() < deadline) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const response = await fetch('/api/ai-widget/owner-canary/turn', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, turnId }),
      signal,
    });
    if (!response.ok) return null;
    const result = await response.json().catch(() => null) as {
      status?: unknown;
      answer?: unknown;
      message?: unknown;
    } | null;
    if (result?.status === 'answered' && typeof result.answer === 'string') {
      return result.answer.trim();
    }
    if (result?.status === 'error') {
      throw new Error(
        typeof result.message === 'string'
          ? result.message
          : 'Не удалось получить ответ.',
      );
    }
    if (result?.status !== 'pending') return null;
    await recoveryDelay(signal);
  }
  return null;
}

export default function AiWidgetPilot() {
  const pathname = usePathname();
  const [isEnabled, setIsEnabled] = useState(false);
  const [handoffMode, setHandoffMode] = useState<
    'off' | 'test' | 'live'
  >('off');
  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [launcherAttentionActive, setLauncherAttentionActive] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    greetingFor(),
  ]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [waitingElapsedSeconds, setWaitingElapsedSeconds] = useState(0);
  const [error, setError] = useState('');
  const [failedMessage, setFailedMessage] = useState<UiMessage | null>(null);
  const [leadStep, setLeadStep] = useState<LeadStep>('idle');
  const [leadDraft, setLeadDraft] = useState<LeadDraft>(emptyLeadDraft);
  const [leadConsent, setLeadConsent] = useState(false);
  const [showLeadOffer, setShowLeadOffer] = useState(false);
  const [leadResult, setLeadResult] = useState<{
    publicId: string;
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
  const promoEngagedChatTrackedRef = useRef(false);
  const userMessageCountRef = useRef(0);
  const pendingPromptRef = useRef('');
  const launcherInteractedRef = useRef(false);
  const attentionStopRef = useRef<number | null>(null);

  const isHidden = pathname.startsWith('/admin') || pathname === '/v4-1';

  const rememberLauncherInteraction = useCallback(() => {
    launcherInteractedRef.current = true;
    setShowInvite(false);
    setLauncherAttentionActive(false);
    if (attentionStopRef.current !== null) {
      window.clearTimeout(attentionStopRef.current);
      attentionStopRef.current = null;
    }
    try {
      window.sessionStorage.setItem(AI_WIDGET_ATTENTION_SESSION_KEY, '1');
    } catch {
      // Browser storage may be unavailable; the current page still stays quiet.
    }
  }, []);

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
        setHandoffMode(
          result.handoffMode === 'test' || result.handoffMode === 'live'
            ? result.handoffMode
            : 'off',
        );
        setLoggingEnabled(result.loggingEnabled === true);
        setMessages((current) => (
          current.length === 1 && current[0]?.id === 'greeting'
            ? [greetingFor()]
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
    if (isHidden || typeof IntersectionObserver === 'undefined') return;

    const footer = document.querySelector('footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsFooterVisible(entry?.isIntersecting === true),
      { threshold: 0.05 },
    );
    observer.observe(footer);

    return () => observer.disconnect();
  }, [isHidden]);

  useEffect(() => {
    if (isHidden || !isEnabled || isOpen) return;

    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(
        AI_WIDGET_ATTENTION_SESSION_KEY,
      ) === '1';
    } catch {
      // A one-page cue still works when session storage is unavailable.
    }
    if (alreadySeen || launcherInteractedRef.current) return;

    const attentionTimer = window.setTimeout(() => {
      if (launcherInteractedRef.current) return;
      try {
        window.sessionStorage.setItem(AI_WIDGET_ATTENTION_SESSION_KEY, '1');
      } catch {
        // Do not block the customer-facing launcher on storage restrictions.
      }
      setShowInvite(true);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      setLauncherAttentionActive(true);
      attentionStopRef.current = window.setTimeout(() => {
        setLauncherAttentionActive(false);
        attentionStopRef.current = null;
      }, AI_WIDGET_ATTENTION_PULSE_MS);
    }, AI_WIDGET_ATTENTION_DELAY_MS);

    return () => {
      window.clearTimeout(attentionTimer);
      if (attentionStopRef.current !== null) {
        window.clearTimeout(attentionStopRef.current);
        attentionStopRef.current = null;
      }
    };
  }, [isEnabled, isHidden, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (pendingPromptRef.current) {
      setDraft(pendingPromptRef.current);
      pendingPromptRef.current = '';
    }
    window.requestAnimationFrame(() => inputRef.current?.focus());
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
        ? promoAttributionFrom(detail, pathname, sessionId())
        : null;
      promoAttributionRef.current = attribution;
      pendingPromptRef.current = typeof detail?.prompt === 'string'
        ? detail.prompt.trim().slice(0, AI_WIDGET_MAX_MESSAGE_LENGTH)
        : '';
      if (attribution) {
        dispatchAiPromoEvent('ai_chat_open', attribution);
      }
      rememberLauncherInteraction();
      setIsOpen(true);
    };
    window.addEventListener('rospark:open-ai-widget', openFromPage);
    return () => window.removeEventListener(
      'rospark:open-ai-widget',
      openFromPage,
    );
  }, [isEnabled, isHidden, pathname, rememberLauncherInteraction]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isSending]);

  useEffect(() => {
    if (!isSending) {
      setWaitingElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    setWaitingElapsedSeconds(0);
    const interval = window.setInterval(() => {
      setWaitingElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isSending]);

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
    const attribution = launcherAttribution(pathname, sessionId());
    promoAttributionRef.current = attribution;
    dispatchAiPromoEvent('ai_chat_open', attribution);
    rememberLauncherInteraction();
    setIsOpen(true);
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
    setMessages([greetingFor()]);
    setDraft('');
    setError('');
    setFailedMessage(null);
    setIsSending(false);
    promoAttributionRef.current = null;
    promoFirstMessageTrackedRef.current = false;
    promoEngagedChatTrackedRef.current = false;
    userMessageCountRef.current = 0;
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
      'Хорошо, оформим обращение. Как к вам обращаться?',
    );
  };

  const handleLeadAnswer = (text: string) => {
    const content = text.trim();
    if (!content) return;
    if (leadStep === 'name') {
      if (content.length < 2) {
        setError('Укажите имя не короче двух символов.');
        return;
      }
      setLeadDraft((current) => ({ ...current, name: content }));
      setLeadStep('contact');
      setDraft('');
      setError('');
      appendLeadExchange(
        content,
        'Укажите номер телефона для связи.',
      );
      return;
    }
    if (leadStep === 'contact') {
      if (content.length < 3) {
        setError('Укажите номер телефона.');
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
        setError('Кратко опишите объект.');
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
        'Заявка подготовлена. Проверьте данные и подтвердите согласие на их обработку.',
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
        `Обращение ${result.publicId} принято.`,
      );
    } catch {
      setLeadStep('review');
      setError('Не удалось отправить заявку. Проверьте данные и попробуйте ещё раз.');
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
    userMessageCountRef.current += 1;
    if (
      promoAttributionRef.current
      && userMessageCountRef.current >= 2
      && !promoEngagedChatTrackedRef.current
    ) {
      promoEngagedChatTrackedRef.current = true;
      dispatchAiPromoEvent(
        'ai_engaged_chat',
        {
          ...promoAttributionRef.current,
          user_message_count: 2,
        },
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
    setFailedMessage(null);
    setIsSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const currentSessionId = sessionId();
    const pageContext = aiWidgetPageContextFromAttribution(
      promoAttributionRef.current,
    );

    try {
      const response = await fetch('/api/ai-widget/chat', {
        method: 'POST',
        headers: {
          Accept: 'application/x-ndjson',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          turnId: userMessage.id,
          sourcePage: pathname,
          ...(pageContext ? { pageContext } : {}),
          messages: modelHistory.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
        signal: controller.signal,
      });
      const result = await readChatResult(response, (answer) => {
        updateAssistantMessage(setMessages, assistantId, answer);
      });
      let answer = result.answer;
      if (result.pending) {
        answer = await recoverOwnerTurn(
          currentSessionId,
          userMessage.id,
          controller.signal,
        ) ?? '';
        if (answer) {
          updateAssistantMessage(setMessages, assistantId, answer);
        }
      }
      if (!answer.trim()) throw new Error('Получен пустой ответ.');
      setFailedMessage(null);
      if (
        (result.leadIntent === 'test' || result.leadIntent === 'live')
        && handoffMode !== 'off'
        && loggingEnabled
      ) {
        setShowLeadOffer(true);
      }
    } catch {
      if (controller.signal.aborted) {
        setMessages((current) => current.filter((message) => (
          message.id !== assistantId || message.content.trim()
        )));
      } else {
        try {
          const recovered = await recoverOwnerTurn(
            currentSessionId,
            userMessage.id,
            controller.signal,
          );
          if (recovered) {
            updateAssistantMessage(setMessages, assistantId, recovered);
            setFailedMessage(null);
          } else {
            throw new Error('TURN_NOT_RECOVERED');
          }
        } catch {
          setMessages((current) => current.filter((message) => (
            message.id !== assistantId || message.content.trim()
          )));
          if (!controller.signal.aborted) {
            setFailedMessage(userMessage);
            setError('Ответ не загрузился. Верните вопрос в поле и попробуйте отправить его ещё раз.');
          }
        }
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsSending(false);
    }
  };

  const sendQuickQuestion = (question: string) => {
    if (promoAttributionRef.current) {
      dispatchAiPromoEvent(
        'ai_quick_question_click',
        {
          ...promoAttributionRef.current,
          quick_question: question,
        },
      );
    }
    void sendMessage(question);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  const restoreFailedQuestion = () => {
    if (!failedMessage) return;
    setMessages((current) => current.filter((message) => (
      message.id !== failedMessage.id
    )));
    setDraft(failedMessage.content);
    setFailedMessage(null);
    setError('');
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const inputPlaceholder = leadStep === 'name'
    ? 'Введите имя…'
    : leadStep === 'contact'
      ? 'Введите телефон…'
      : leadStep === 'object'
        ? 'Опишите объект…'
        : leadStep === 'task'
          ? 'Опишите задачу…'
          : 'Например: торговый центр, один въезд, один выезд, 350 машин…';
  const inputDisabled = (
    isSending
    || leadStep === 'review'
    || leadStep === 'submitting'
    || leadStep === 'submitted'
  );
  const waitingStage = aiWidgetWaitingStageFor(waitingElapsedSeconds);

  return (
    <>
      {!isOpen && (
        <div
          className="fixed right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:right-6"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {showInvite && !isFooterVisible && (
            <div className="relative w-[min(17rem,calc(100vw-2rem))] rounded-2xl border border-blue-100 bg-white p-4 pr-12 text-sm leading-5 text-slate-700 shadow-xl">
              <button
                type="button"
                onClick={rememberLauncherInteraction}
                className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                aria-label="Скрыть приглашение"
              >
                <X size={18} aria-hidden="true" />
              </button>
              <p className="font-bold text-slate-950">Поможем разобраться с парковкой</p>
              <p className="mt-1">
                Опишите задачу — консультант подскажет подходящий вариант.
              </p>
            </div>
          )}
          <button
            ref={launcherRef}
            type="button"
            onClick={openWidget}
            className={`group inline-flex min-h-16 max-w-[calc(100vw-2rem)] transform-gpu items-center gap-3 rounded-2xl bg-blue-700 px-3 py-2 text-left text-white shadow-xl transition duration-500 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${launcherAttentionActive ? 'scale-[1.025] shadow-2xl' : 'scale-100'}`}
            data-attention-cue={launcherAttentionActive ? 'active' : 'idle'}
            aria-label="Открыть онлайн-консультанта РОСПАРК"
            aria-expanded="false"
            aria-controls="rospark-ai-widget-panel"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <MessageCircle size={24} aria-hidden="true" />
            </span>
            <span className="min-w-0 pr-1">
              <span className="block text-sm font-bold leading-5">
                Задать вопрос по парковке
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs leading-4 text-blue-100">
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(52,211,153,0.16)]"
                  aria-hidden="true"
                />
                <span>Онлайн-консультант РОСПАРК</span>
              </span>
            </span>
          </button>
        </div>
      )}

      {isOpen && (
        <section
          id="rospark-ai-widget-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="rospark-ai-widget-title"
          className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] top-[max(0.5rem,env(safe-area-inset-top))] z-[1200] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[min(760px,calc(100dvh-3rem))] sm:w-[430px]"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 bg-slate-950 px-5 py-4 text-white">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600">
                <MessageCircle size={21} aria-hidden="true" />
              </span>
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                  Онлайн
                </p>
                <h2 id="rospark-ai-widget-title" className="mt-1 text-base font-bold">
                  Онлайн-консультант РОСПАРК
                </h2>
                <p className="mt-0.5 text-xs leading-4 text-slate-300">
                  Вопросы по парковке и оборудованию
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label="Очистить диалог"
              >
                <RotateCcw size={18} aria-hidden="true" />
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={closeWidget}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label="Свернуть онлайн-консультанта"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div
            className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4 sm:py-5"
            aria-live="polite"
            aria-busy={isSending}
          >
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-6 ${
                      message.role === 'user'
                        ? 'rounded-br-md bg-blue-700 text-white'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    {message.content ? (
                      <MessageText content={message.content} />
                    ) : (
                      <div
                        className="w-[min(18rem,72vw)]"
                        role="status"
                        aria-label={waitingStage.title}
                      >
                        <span className="flex items-center gap-2 font-semibold text-slate-800">
                          <span>{waitingStage.title}</span>
                          <span className="inline-flex items-center gap-1" aria-hidden="true">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 [animation-delay:-300ms] motion-reduce:animate-none" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 [animation-delay:-150ms] motion-reduce:animate-none" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 motion-reduce:animate-none" />
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">
                          {waitingStage.detail}
                        </span>
                        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                          <span
                            className={`block h-full rounded-full bg-blue-600 transition-[width] duration-700 motion-reduce:transition-none ${waitingStage.isLongWait ? 'animate-pulse motion-reduce:animate-none' : ''}`}
                            style={{ width: `${waitingStage.progressPercent}%` }}
                          />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {messages.length === 1 && (
                <div className="grid gap-2 pt-2">
                  <p className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Можно начать с готового вопроса
                  </p>
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => sendQuickQuestion(question)}
                      className="min-h-11 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm font-semibold leading-5 text-blue-950 transition hover:border-blue-400 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
              {showLeadOffer && leadStep === 'idle' ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs leading-5 text-blue-950">
                    Передать задачу специалисту РОСПАРК?
                  </p>
                  <button
                    type="button"
                    onClick={startLeadFlow}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <ClipboardList size={15} aria-hidden="true" />
                    Оставить заявку
                  </button>
                </div>
              ) : null}
              {leadStep === 'review' || leadStep === 'submitting' ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-slate-800">
                  <p className="font-bold text-slate-950">
                    Проверьте заявку
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
                      Даю{' '}
                      <Link
                        href="/soglasie-na-obrabotku-personalnyh-dannyh"
                        target="_blank"
                        className="font-semibold text-blue-800 underline"
                      >
                        согласие на обработку персональных данных
                      </Link>
                      {' '}для обработки обращения и связи со мной.
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
                        : 'Отправить заявку'}
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
                    {`Обращение ${leadResult.publicId} принято`}
                  </p>
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

          <footer className="shrink-0 border-t border-slate-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:p-4">
            {error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-800" role="alert">
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                  <span>{error}</span>
                </p>
                {failedMessage ? (
                  <button
                    type="button"
                    onClick={restoreFailedQuestion}
                    className="mt-2 min-h-11 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    Вернуть вопрос в поле
                  </button>
                ) : null}
              </div>
            )}
            {isSending ? (
              <p className="mb-2 text-xs leading-5 text-slate-600" role="status">
                Вопрос отправлен. Повторно нажимать не нужно.
              </p>
            ) : null}
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
                rows={2}
                placeholder={inputPlaceholder}
                className="max-h-32 min-h-16 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-950 outline-none transition [scrollbar-width:none] placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 [&::-webkit-scrollbar]:hidden"
                disabled={inputDisabled}
              />
              {isSending ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-white transition hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600"
                  aria-label="Остановить ответ"
                >
                  <Square size={17} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!draft.trim() || inputDisabled}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  aria-label="Отправить вопрос"
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              )}
            </form>
            <p className="mt-2 text-center text-xs leading-4 text-slate-600">
              Сообщения обрабатываются для подготовки ответа.{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="underline"
              >
                Политика обработки данных
              </Link>
            </p>
          </footer>
        </section>
      )}
    </>
  );
}
