'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CarFront,
  Check,
  ClipboardList,
  Clock3,
  Copy,
  ExternalLink,
  FilePlus2,
  KeyRound,
  LayoutGrid,
  List,
  LogOut,
  Maximize2,
  MessageCircle,
  QrCode as QrCodeIcon,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import QRCode from 'qrcode';
import DemoScenarioNav from '@/app/components/demo/DemoScenarioNav';
import { dispatchDemoEvent } from '@/app/lib/analytics-events';
import {
  DEMO_FEEDBACK_CONSENT_NOTE,
  DEMO_FEEDBACK_CONSENT_TEXT,
  type DemoFeedbackChannel,
} from '@/app/lib/demo-feedback-consent';

type PortalView = 'new' | 'requests' | 'detail';
type RequestType = 'single' | 'multiple';
type StoredStatus = 'waiting' | 'cancelled' | 'active' | 'completed';
type DisplayStatus = StoredStatus | 'expired';
type RequestsLayout = 'rows' | 'cards';

type GuestRequest = {
  id: string;
  publicToken: string;
  createdAt: string;
  tenant: 'TEST';
  guestName: string;
  validFrom: string;
  validUntil: string;
  requestType: RequestType;
  phone: string;
  vehicleNumber: string;
  note: string;
  status: StoredStatus;
  enteredAt?: string;
  exitedAt?: string;
  hourlyRate?: number;
  isSeed?: boolean;
};

const DEMO_HOURLY_RATE = 100;
const PAGE_PATH = '/demo/gostevaya-zayavka';

const statusLabels: Record<DisplayStatus, string> = {
  waiting: 'Ожидает въезда',
  active: 'На территории',
  completed: 'Завершена',
  cancelled: 'Отменена',
  expired: 'Просрочена',
};

const statusClasses: Record<DisplayStatus, string> = {
  waiting: 'border-amber-200 bg-amber-50 text-amber-900',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  completed: 'border-blue-200 bg-blue-50 text-blue-800',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-800',
  expired: 'border-slate-200 bg-slate-100 text-slate-600',
};

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultDates() {
  const from = new Date(Date.now() + 60 * 60 * 1000);
  const until = new Date(from.getTime() + 3 * 60 * 60 * 1000);
  return {
    validFrom: toDateTimeLocal(from),
    validUntil: toDateTimeLocal(until),
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) return `7${digits.slice(1)}`;
  return digits;
}

function normalizeVehicleNumber(value: string) {
  return value.toUpperCase().replace(/\s+/g, '').trim();
}

function getStayMinutes(request: GuestRequest, nowMs = Date.now()) {
  if (!request.enteredAt) return 0;
  const end = request.exitedAt ? new Date(request.exitedAt).getTime() : nowMs;
  return Math.max(0, Math.round((end - new Date(request.enteredAt).getTime()) / 60_000));
}

function getParkingCost(request: GuestRequest, nowMs = Date.now()) {
  const minutes = getStayMinutes(request, nowMs);
  if (!minutes) return 0;
  return Math.ceil(minutes / 60) * (request.hourlyRate ?? DEMO_HOURLY_RATE);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} мин`;
  if (!rest) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

function formatRubles(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

function getDisplayStatus(request: GuestRequest): DisplayStatus {
  if (request.status === 'cancelled') return 'cancelled';
  if (request.status === 'active') return 'active';
  if (request.status === 'completed') return 'completed';
  if (new Date(request.validUntil).getTime() < Date.now()) return 'expired';
  return 'waiting';
}

function RequestQr({ value }: { value: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then((result) => {
      if (active) setSrc(result);
    });
    return () => {
      active = false;
    };
  }, [value]);

  if (!src) {
    return <div className="h-52 w-52 animate-pulse rounded-2xl bg-slate-100" aria-label="QR-код создаётся" />;
  }

  return (
    <Image
      src={src}
      alt="Демонстрационный QR-код заявки"
      width={208}
      height={208}
      unoptimized
      className="h-52 w-52 rounded-2xl"
    />
  );
}

function RequestStatus({ status }: { status: DisplayStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export default function GuestRequestPortal() {
  const initialDates = useMemo(() => defaultDates(), []);
  const [authenticated, setAuthenticated] = useState(false);
  const [login, setLogin] = useState('TEST');
  const [password, setPassword] = useState('TEST');
  const [loginError, setLoginError] = useState('');
  const [view, setView] = useState<PortalView>('new');
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [requestsLayout, setRequestsLayout] = useState<RequestsLayout>('rows');
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [validFrom, setValidFrom] = useState(initialDates.validFrom);
  const [validUntil, setValidUntil] = useState(initialDates.validUntil);
  const [requestType, setRequestType] = useState<RequestType>('single');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [feedbackConsent, setFeedbackConsent] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setClockMs(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const selectedRequest = requests.find((request) => request.id === selectedId) ?? null;
  const requestSummary = useMemo(() => {
    const counts = { waiting: 0, active: 0, completed: 0 };
    let totalCost = 0;
    for (const request of requests) {
      const status = getDisplayStatus(request);
      if (status === 'waiting' || status === 'active' || status === 'completed') counts[status] += 1;
      if (status === 'completed') totalCost += getParkingCost(request, clockMs);
    }
    return { ...counts, totalCost };
  }, [clockMs, requests]);

  async function loadRequests() {
    const response = await fetch('/api/demo/requests', { cache: 'no-store' });
    const payload = (await response.json().catch(() => null)) as { requests?: GuestRequest[]; error?: string } | null;
    if (!response.ok || !payload?.requests) throw new Error(payload?.error || 'Не удалось загрузить demo-заявки.');
    setRequests(payload.requests);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setLoginError(payload?.error || 'Для демо используйте логин TEST и пароль TEST.');
        return;
      }
      await loadRequests();
      setNotice('');
      setAuthenticated(true);
      setView('new');
      dispatchDemoEvent('demo_login', { demo_name: 'guest_request_portal' });
    } catch {
      setLoginError('Сервер demo-кабинета временно недоступен.');
    }
  }

  async function handleLogout() {
    await fetch('/api/demo/session', { method: 'DELETE' }).catch(() => undefined);
    setAuthenticated(false);
    setPassword('TEST');
    setView('new');
    setSelectedId(null);
    setRequests([]);
    setNotice('');
    setFeedbackConsent(false);
    window.history.replaceState({}, '', PAGE_PATH);
    dispatchDemoEvent('demo_logout', { demo_name: 'guest_request_portal' });
  }

  function resetForm() {
    const dates = defaultDates();
    setGuestName('');
    setValidFrom(dates.validFrom);
    setValidUntil(dates.validUntil);
    setRequestType('single');
    setPhone('');
    setVehicleNumber('');
    setNote('');
    setFormError('');
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const normalizedPhone = normalizePhone(phone);
    const normalizedVehicle = normalizeVehicleNumber(vehicleNumber);

    if (!guestName.trim()) {
      setFormError('Укажите имя гостя.');
      return;
    }
    if (normalizedPhone.length !== 11 || !normalizedPhone.startsWith('7')) {
      setFormError('Укажите российский телефон в формате +7 и 10 цифр.');
      return;
    }
    if (normalizedVehicle.length < 6) {
      setFormError('Укажите номер автомобиля для видеораспознавания.');
      return;
    }
    if (!validFrom || !validUntil || new Date(validUntil) <= new Date(validFrom)) {
      setFormError('Дата окончания должна быть позже даты начала.');
      return;
    }

    try {
      const response = await fetch('/api/demo/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: guestName.trim(),
          validFrom: new Date(validFrom).toISOString(),
          validUntil: new Date(validUntil).toISOString(),
          requestType,
          phone: normalizedPhone,
          vehicleNumber: normalizedVehicle,
          note: note.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { request?: GuestRequest; error?: string } | null;
      if (!response.ok || !payload?.request) {
        setFormError(payload?.error || 'Не удалось создать заявку.');
        return;
      }
      setRequests((current) => [payload.request as GuestRequest, ...current]);
      setSelectedId(payload.request.id);
      setView('detail');
      setFeedbackConsent(false);
      resetForm();
      dispatchDemoEvent('demo_request_create', {
        demo_name: 'guest_request_portal',
        request_type: requestType,
        status: 'waiting',
      });
    } catch {
      setFormError('Сервер demo-заявок временно недоступен.');
    }
  }

  function openRequest(id: string) {
    setSelectedId(id);
    setView('detail');
    setFeedbackConsent(false);
    dispatchDemoEvent('demo_request_view', { demo_name: 'guest_request_portal' });
  }

  async function cancelRequest(id: string) {
    const target = requests.find((request) => request.id === id);
    if (!target || getDisplayStatus(target) !== 'waiting') return;
    const response = await fetch(`/api/demo/requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    const payload = (await response.json().catch(() => null)) as { request?: GuestRequest; error?: string } | null;
    if (!response.ok || !payload?.request) {
      setNotice(payload?.error || 'Не удалось отменить заявку.');
      return;
    }
    setRequests((current) => current.map((request) => request.id === id ? payload.request as GuestRequest : request));
    setNotice('Заявка отменена и сохранена в серверном журнале demo.');
    dispatchDemoEvent('demo_request_cancel', { demo_name: 'guest_request_portal', status: 'cancelled' });
  }

  function getPublicUrl(request: GuestRequest) {
    const path = `/demo/arendar/${request.publicToken}`;
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  }

  async function saveFeedbackLead(request: GuestRequest, channel: DemoFeedbackChannel) {
    if (!feedbackConsent || request.isSeed) return 'not-requested' as const;
    try {
      const response = await fetch('/api/demo/feedback-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          channel,
          consent: true,
        }),
      });
      if (!response.ok) return 'failed' as const;
      return 'saved' as const;
    } catch {
      return 'failed' as const;
    }
  }

  function shareNotice(baseNotice: string, feedbackResult: 'saved' | 'not-requested' | 'failed') {
    if (feedbackResult === 'saved') {
      return 'Тестовая заявка отправлена. При необходимости специалист РОСПАРК может связаться с вами и уточнить, всё ли сработало корректно.';
    }
    if (feedbackResult === 'failed') {
      return `${baseNotice} Контакт для обратной связи сохранить не удалось — при желании повторите действие позже.`;
    }
    return baseNotice;
  }

  async function copyPublicLink(request: GuestRequest) {
    try {
      await navigator.clipboard.writeText(getPublicUrl(request));
      const feedbackResult = await saveFeedbackLead(request, 'copy');
      setNotice(shareNotice(
        'Публичная ссылка скопирована. Заявка откроется на другом устройстве в течение 24 часов.',
        feedbackResult,
      ));
      dispatchDemoEvent('demo_share', { demo_name: 'guest_request_portal', channel: 'copy' });
    } catch {
      setNotice('Не удалось скопировать ссылку. Разрешите доступ к буферу обмена и повторите попытку.');
    }
  }

  async function openWhatsApp(request: GuestRequest) {
    const message = `Демо-заявка РОСПАРК № ${request.id}. Действует: ${formatDateTime(request.validFrom)} — ${formatDateTime(request.validUntil)}. ${getPublicUrl(request)}`;
    window.open(
      `https://wa.me/${request.phone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
    const feedbackResult = await saveFeedbackLead(request, 'whatsapp');
    setNotice(shareNotice(
      'Открыт экран подготовки сообщения WhatsApp. Отправку подтверждает пользователь.',
      feedbackResult,
    ));
    dispatchDemoEvent('demo_share', { demo_name: 'guest_request_portal', channel: 'whatsapp' });
  }

  async function sendToMax(request: GuestRequest) {
    try {
      const response = await fetch('/api/demo/share/max', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      });
      if (response.ok) {
        const feedbackResult = await saveFeedbackLead(request, 'max');
        setNotice(shareNotice(
          'Заявка отправлена в MAX через сервис уведомлений РОСПАРК.',
          feedbackResult,
        ));
        dispatchDemoEvent('demo_share', { demo_name: 'guest_request_portal', channel: 'max' });
      } else if (response.status === 503) {
        await shareToMax(request);
      } else {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setNotice(payload?.error ?? 'Не удалось отправить сообщение. Попробуйте ещё раз.');
      }
    } catch {
      await shareToMax(request);
    }
  }

  async function shareToMax(request: GuestRequest) {
    const shareData = {
      title: `Демо-заявка РОСПАРК № ${request.id}`,
      text: `Гостевая заявка действует ${formatDateTime(request.validFrom)} — ${formatDateTime(request.validUntil)}.`,
      url: getPublicUrl(request),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        setNotice('Отправка через системное меню отменена.');
        return;
      }
      const feedbackResult = await saveFeedbackLead(request, 'max');
      setNotice(shareNotice(
        'Заявка передана в системное меню отправки. Выберите MAX, если он установлен на устройстве.',
        feedbackResult,
      ));
    } else {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      const feedbackResult = await saveFeedbackLead(request, 'max');
      setNotice(shareNotice(
        'Текст и ссылка скопированы. Их можно вставить в сообщение MAX.',
        feedbackResult,
      ));
    }
    dispatchDemoEvent('demo_share', { demo_name: 'guest_request_portal', channel: 'max' });
  }

  return (
    <section aria-labelledby="portal-title" className="mt-10 sm:mt-14">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent-primary">Рабочий прототип</p>
        <h2 id="portal-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Личный кабинет арендатора
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Внутри показан интерфейс так, как арендатор увидит его в обычном браузере. Добавленные заявки хранятся в demo-базе до 24 часов.
        </p>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Предпросмотр кабинета в браузере арендатора</div>
      <div className="overflow-hidden rounded-[28px] border-2 border-blue-200 bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.18)] ring-4 ring-blue-50">
        <div className="flex items-center gap-2 border-b border-blue-100 bg-white px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <div className="ml-2 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-center text-xs font-semibold text-slate-700">
            www.роспарк.рф/demo/arendar
          </div>
          <Maximize2 aria-hidden="true" size={16} className="text-slate-400" />
        </div>

        {!authenticated ? (
          <div className="grid min-h-[650px] bg-white lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative hidden min-h-full overflow-hidden bg-slate-950 lg:block">
              <Image
                src="/images/demo/bc-severnaya-bashnya.webp"
                alt="Въезд и главный вход бизнес-центра РОСПАРК"
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover opacity-70"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-10 text-white">
                <div className="inline-flex rounded-2xl bg-white/10 p-3 backdrop-blur"><Building2 aria-hidden="true" size={28} /></div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Бизнес-центр «РОСПАРК»</p>
                <h3 className="mt-3 max-w-xl text-3xl font-bold leading-tight">Гостевой доступ без звонков на пост охраны</h3>
                <p className="mt-4 max-w-lg leading-7 text-slate-200">Арендатор создаёт заявку, гость получает данные для въезда, а служба безопасности видит единый журнал.</p>
              </div>
            </div>

            <div className="flex items-center justify-center p-5 sm:p-10 lg:p-12">
              <form onSubmit={handleLogin} className="w-full max-w-md" noValidate>
                <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700"><KeyRound aria-hidden="true" size={26} /></div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Бизнес-центр «РОСПАРК»</p>
                <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Вход для арендатора</h3>
                <p className="mt-3 leading-7 text-slate-600">После входа откроется форма создания гостевой заявки.</p>

                <div className="mt-8 grid gap-5">
                  <label className="grid gap-2 text-sm font-semibold text-slate-800">
                    Логин
                    <input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-800">
                    Пароль
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </label>
                </div>

                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Демо-доступ: логин <strong>TEST</strong>, пароль <strong>TEST</strong>.
                </div>
                {loginError ? <p role="alert" className="mt-4 text-sm font-medium text-rose-700">{loginError}</p> : null}
                <button type="submit" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-primary px-5 py-3 font-semibold text-white transition hover:bg-state-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2">
                  Войти в кабинет
                  <Check aria-hidden="true" size={18} />
                </button>
                <p className="mt-5 text-center text-xs leading-5 text-slate-500">Это демонстрация интерфейса. TEST/TEST не является настоящей системой авторизации.</p>
              </form>
            </div>
          </div>
        ) : (
          <div className="min-h-[720px] bg-slate-50">
            <header className="border-b border-slate-200 bg-slate-950 text-white">
              <div className="flex flex-col gap-4 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-blue-600 p-2.5"><Building2 aria-hidden="true" size={22} /></span>
                  <div>
                    <p className="font-bold">Бизнес-центр «РОСПАРК»</p>
                    <p className="text-xs text-slate-400">Кабинет арендатора · TEST</p>
                  </div>
                </div>
                <nav aria-label="Навигация личного кабинета" className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setView('new'); setNotice(''); }} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${view === 'new' ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}><FilePlus2 aria-hidden="true" size={17} />Новая заявка</button>
                  <button type="button" onClick={() => { setView('requests'); setNotice(''); }} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${view === 'requests' || view === 'detail' ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}><ClipboardList aria-hidden="true" size={17} />Мои заявки <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{requests.length}</span></button>
                  <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-200"><LogOut aria-hidden="true" size={17} />Выйти</button>
                </nav>
              </div>
              <DemoScenarioNav active="guest-requests" />
            </header>

            <div className="p-4 sm:p-7 lg:p-9">
              {notice ? <div role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">{notice}</div> : null}

              {view === 'new' ? (
                <div className="mx-auto max-w-4xl">
                  <div className="mb-7">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Новая заявка</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Создать гостевой доступ</h3>
                    <p className="mt-3 leading-7 text-slate-600">Номер автомобиля обязателен: он используется как идентификатор для видеораспознавания.</p>
                  </div>
                  <form onSubmit={handleCreate} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" noValidate>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <span className="text-sm text-slate-500">Заявка от</span>
                        <p className="mt-1 font-semibold text-slate-950">TEST</p>
                      </div>
                      <label className="grid gap-2 text-sm font-semibold text-slate-800">Имя гостя<input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Например, Алексей Смирнов" className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-800">Телефон гостя<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+7 999 123-45-67" className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-800">Въезд от<input type="datetime-local" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-800">Въезд до<input type="datetime-local" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-800">Тип заявки<select value={requestType} onChange={(event) => setRequestType(event.target.value as RequestType)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="single">Одноразовая</option><option value="multiple">Многоразовая</option></select></label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-800">Номер автомобиля<input value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} placeholder="А123АА 77" className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">Примечание<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Цель визита, компания или контактное лицо" rows={3} className="rounded-xl border border-slate-300 px-4 py-3 text-base font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                    </div>
                    {formError ? <p role="alert" className="mt-5 text-sm font-medium text-rose-700">{formError}</p> : null}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-5 text-slate-500">Заявка хранится на demo-сервере до 24 часов и доступна гостю по публичной ссылке.</p>
                      <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-primary px-6 py-3 font-semibold text-white transition hover:bg-state-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"><QrCodeIcon aria-hidden="true" size={19} />Создать заявку</button>
                    </div>
                  </form>
                </div>
              ) : null}

              {view === 'requests' ? (
                <div className="mx-auto max-w-7xl">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">История и расчёты</p><h3 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Мои заявки</h3><p className="mt-2 text-slate-600">15 постоянных demo-заявок и до 20 добавленных вами записей.</p></div>
                    <button type="button" onClick={() => setView('new')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 font-semibold text-white"><FilePlus2 aria-hidden="true" size={18} />Новая заявка</button>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Ожидают</p><p className="mt-1 text-2xl font-bold text-amber-950">{requestSummary.waiting}</p></div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">На территории</p><p className="mt-1 text-2xl font-bold text-emerald-950">{requestSummary.active}</p></div>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Завершены</p><p className="mt-1 text-2xl font-bold text-blue-950">{requestSummary.completed}</p></div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-wide text-slate-300">К оплате · завершённые</p><p className="mt-1 text-2xl font-bold">{formatRubles(requestSummary.totalCost)}</p></div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">100 ₽/ч, округление вверх. Начисление появляется только после выезда.</p>
                    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Вид списка заявок">
                      <button type="button" aria-pressed={requestsLayout === 'rows'} onClick={() => setRequestsLayout('rows')} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${requestsLayout === 'rows' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><List aria-hidden="true" size={16} />Строки</button>
                      <button type="button" aria-pressed={requestsLayout === 'cards'} onClick={() => setRequestsLayout('cards')} className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${requestsLayout === 'cards' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutGrid aria-hidden="true" size={16} />Карточки</button>
                    </div>
                  </div>
                  {requests.length ? (
                    requestsLayout === 'cards' ? (
                      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {requests.map((request) => {
                          const status = getDisplayStatus(request);
                          const stayMinutes = getStayMinutes(request, clockMs);
                          const cost = getParkingCost(request, clockMs);
                          return (
                            <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-slate-500">№ {request.id}</p><h4 className="mt-2 text-lg font-bold text-slate-950">{request.guestName}</h4></div><RequestStatus status={status} /></div>
                              <dl className="mt-5 grid gap-3 text-sm"><div className="flex items-center gap-2 text-slate-600"><CarFront aria-hidden="true" size={17} /><span className="font-semibold text-slate-900">{request.vehicleNumber}</span></div><div className="flex items-center gap-2 text-slate-600"><CalendarDays aria-hidden="true" size={17} />{formatDateTime(request.validFrom)}</div>{status === 'completed' ? <><div className="flex items-center gap-2 text-slate-600"><Clock3 aria-hidden="true" size={17} />{formatDuration(stayMinutes)}</div><div className="rounded-xl bg-slate-100 px-3 py-2 font-semibold text-slate-950">К оплате: {formatRubles(cost)}</div></> : status === 'active' ? <div className="rounded-xl bg-emerald-50 px-3 py-2 font-medium text-emerald-800">Расчёт после выезда</div> : <div className="flex items-center gap-2 text-slate-600"><Clock3 aria-hidden="true" size={17} />до {formatDateTime(request.validUntil)}</div>}</dl>
                              <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => openRequest(request.id)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Открыть<ExternalLink aria-hidden="true" size={16} /></button>{status === 'waiting' && !request.isSeed ? <button type="button" onClick={() => cancelRequest(request.id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 aria-hidden="true" size={16} />Отменить</button> : null}</div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full min-w-[800px] table-fixed border-collapse text-left text-[13px]">
                          <colgroup><col className="w-[14%]" /><col className="w-[17%]" /><col className="w-[17%]" /><col className="w-[12%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[6%]" /></colgroup>
                          <thead className="bg-slate-950 text-[11px] uppercase tracking-wide text-slate-200"><tr><th className="px-3 py-3">Код</th><th className="px-3 py-3">Состояние</th><th className="px-3 py-3">Гость</th><th className="px-3 py-3">Авто</th><th className="px-3 py-3">Въезд</th><th className="px-3 py-3">Время</th><th className="px-3 py-3 text-right">Сумма</th><th className="px-2 py-3"><span className="sr-only">Действие</span></th></tr></thead>
                          <tbody className="divide-y divide-slate-200">
                            {requests.map((request) => {
                              const status = getDisplayStatus(request);
                              const stayMinutes = getStayMinutes(request, clockMs);
                              const isCompleted = status === 'completed';
                              return <tr key={request.id} className="hover:bg-slate-50"><td className="truncate px-3 py-3 font-mono text-[11px] text-slate-600" title={request.id}>{request.id}</td><td className="px-3 py-3"><RequestStatus status={status} /></td><td className="px-3 py-3 font-semibold leading-5 text-slate-950">{request.guestName}</td><td className="whitespace-nowrap px-3 py-3 font-mono font-bold">{request.vehicleNumber}</td><td className="px-3 py-3 leading-5 text-slate-600">{request.enteredAt ? formatDateTime(request.enteredAt) : formatDateTime(request.validFrom)}</td><td className="whitespace-nowrap px-3 py-3 text-slate-700">{isCompleted ? formatDuration(stayMinutes) : '—'}</td><td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-950">{isCompleted ? formatRubles(getParkingCost(request, clockMs)) : '—'}</td><td className="px-2 py-3 text-center"><button type="button" aria-label={`Открыть заявку ${request.id}`} title="Открыть заявку" onClick={() => openRequest(request.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100"><ExternalLink aria-hidden="true" size={15} /></button></td></tr>;
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center"><ClipboardList aria-hidden="true" size={34} className="mx-auto text-slate-400" /><h4 className="mt-4 font-semibold text-slate-900">Заявок пока нет</h4><p className="mt-2 text-sm text-slate-600">Создайте первую гостевую заявку в demo-кабинете.</p></div>
                  )}
                </div>
              ) : null}

              {view === 'detail' && selectedRequest ? (
                <div className="mx-auto max-w-4xl">
                  <button type="button" onClick={() => setView('requests')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-700"><ArrowLeft aria-hidden="true" size={17} />К моим заявкам</button>
                  <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-950 px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><p className="text-xs uppercase tracking-[0.14em] text-blue-300">Гостевая заявка</p><h3 className="mt-2 break-all font-mono text-xl font-bold sm:text-2xl">№ {selectedRequest.id}</h3></div><RequestStatus status={getDisplayStatus(selectedRequest)} /></div>
                    <div className="grid lg:grid-cols-[1fr_280px]">
                      <div className="p-5 sm:p-8">
                        <dl className="grid gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
                          <div><dt className="text-slate-500">Создана</dt><dd className="mt-1 font-semibold text-slate-950">{formatDateTime(selectedRequest.createdAt)}</dd></div>
                          <div><dt className="text-slate-500">Заявка от</dt><dd className="mt-1 font-semibold text-slate-950">{selectedRequest.tenant}</dd></div>
                          <div><dt className="text-slate-500">Гость</dt><dd className="mt-1 font-semibold text-slate-950">{selectedRequest.guestName}</dd></div>
                          <div><dt className="text-slate-500">Телефон</dt><dd className="mt-1 font-semibold text-slate-950">+{selectedRequest.phone}</dd></div>
                          <div><dt className="text-slate-500">Въезд от</dt><dd className="mt-1 font-semibold text-slate-950">{formatDateTime(selectedRequest.validFrom)}</dd></div>
                          <div><dt className="text-slate-500">Въезд до</dt><dd className="mt-1 font-semibold text-slate-950">{formatDateTime(selectedRequest.validUntil)}</dd></div>
                          <div><dt className="text-slate-500">Тип</dt><dd className="mt-1 font-semibold text-slate-950">{selectedRequest.requestType === 'single' ? 'Одноразовая' : 'Многоразовая'}</dd></div>
                          <div><dt className="text-slate-500">Автомобиль</dt><dd className="mt-1 inline-flex rounded-lg border-2 border-slate-900 bg-white px-3 py-1 font-mono text-lg font-bold text-slate-950">{selectedRequest.vehicleNumber}</dd></div>
                          {selectedRequest.enteredAt ? <div><dt className="text-slate-500">Фактический въезд</dt><dd className="mt-1 font-semibold text-slate-950">{formatDateTime(selectedRequest.enteredAt)}</dd></div> : null}
                          {selectedRequest.exitedAt ? <div><dt className="text-slate-500">Фактический выезд</dt><dd className="mt-1 font-semibold text-slate-950">{formatDateTime(selectedRequest.exitedAt)}</dd></div> : null}
                          {selectedRequest.exitedAt ? <div><dt className="text-slate-500">Время на парковке</dt><dd className="mt-1 font-semibold text-slate-950">{formatDuration(getStayMinutes(selectedRequest, clockMs))}</dd></div> : null}
                          {selectedRequest.exitedAt ? <div><dt className="text-slate-500">Начислено · 100 ₽/ч</dt><dd className="mt-1 text-xl font-bold text-blue-700">{formatRubles(getParkingCost(selectedRequest, clockMs))}</dd></div> : selectedRequest.enteredAt ? <div><dt className="text-slate-500">Расчёт стоимости</dt><dd className="mt-1 font-semibold text-emerald-700">Будет выполнен после выезда</dd></div> : null}
                          <div className="sm:col-span-2"><dt className="text-slate-500">Примечание</dt><dd className="mt-1 font-medium leading-6 text-slate-900">{selectedRequest.note || '—'}</dd></div>
                        </dl>
                      </div>
                      <div className="flex flex-col items-center justify-center border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0"><RequestQr value={getPublicUrl(selectedRequest)} /><p className="mt-3 text-center font-mono text-xs text-slate-500">QR содержит публичную demo-ссылку и код заявки</p></div>
                    </div>
                    <div className="border-t border-slate-200 p-5 sm:p-8">
                      {!selectedRequest.isSeed ? (
                        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
                          <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold leading-6 text-slate-900">
                            <input
                              type="checkbox"
                              checked={feedbackConsent}
                              onChange={(event) => setFeedbackConsent(event.target.checked)}
                              aria-describedby="demo-feedback-consent-note"
                              className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            />
                            <span>{DEMO_FEEDBACK_CONSENT_TEXT}</span>
                          </label>
                          <p id="demo-feedback-consent-note" className="mt-2 pl-8 text-xs leading-5 text-slate-600">
                            {DEMO_FEEDBACK_CONSENT_NOTE}. Согласие необязательно и не влияет на работу заявки.{' '}
                            <Link
                              href="/privacy"
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
                            >
                              Политика обработки персональных данных
                            </Link>
                          </p>
                        </div>
                      ) : (
                        <p className="mb-5 rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-600">
                          Для тестовой отправки на свой телефон и добровольной обратной связи создайте собственную demo-заявку.
                        </p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <button type="button" onClick={() => copyPublicLink(selectedRequest)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"><Copy aria-hidden="true" size={17} />Копировать ссылку</button>
                        <button type="button" onClick={() => openWhatsApp(selectedRequest)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><MessageCircle aria-hidden="true" size={17} />WhatsApp</button>
                        <button type="button" onClick={() => sendToMax(selectedRequest)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><MessageCircle aria-hidden="true" size={17} />Отправить в MAX</button>
                        {!selectedRequest.isSeed && getDisplayStatus(selectedRequest) === 'waiting' ? <button type="button" onClick={() => cancelRequest(selectedRequest.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 aria-hidden="true" size={17} />Отменить</button> : <div className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500">{selectedRequest.isSeed ? 'Постоянный demo-пример' : 'Изменение закрыто'}</div>}
                      </div>
                      <p className="mt-4 text-xs leading-5 text-slate-500">MAX использует сервис уведомлений РОСПАРК, если отправка включена; иначе открывается системное меню «Поделиться». WhatsApp открывает экран подготовки сообщения и требует подтверждения пользователя.</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><ShieldCheck aria-hidden="true" size={20} className="text-blue-700" /><p className="mt-2 font-semibold text-slate-900">Изолированная demo-база</p><p className="mt-1">Каждый браузер видит только свои заявки и 15 постоянных примеров.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><Clock3 aria-hidden="true" size={20} className="text-blue-700" /><p className="mt-2 font-semibold text-slate-900">Автоочистка</p><p className="mt-1">До 20 ваших заявок, срок хранения — 24 часа.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><UserRound aria-hidden="true" size={20} className="text-blue-700" /><p className="mt-2 font-semibold text-slate-900">Демо-доступ</p><p className="mt-1">TEST/TEST работает только внутри этой страницы.</p></div>
      </div>
    </section>
  );
}
