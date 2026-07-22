'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  BadgePercent,
  Banknote,
  CarFront,
  Check,
  CheckCircle2,
  Clock3,
  History,
  KeyRound,
  Loader2,
  PackageCheck,
  Search,
  SearchX,
  Ticket,
  Truck,
  X,
} from 'lucide-react';
import DemoBrowserFrame from '@/app/components/demo/DemoBrowserFrame';
import DemoCabinetHeader from '@/app/components/demo/DemoCabinetHeader';
import DemoStatusBadge from '@/app/components/demo/DemoStatusBadge';

type AuthState = 'checking' | 'guest' | 'authenticated';
type SearchMode = 'ticket' | 'vehicle';
type VehicleType = 'car' | 'truck';

type ParkingSession = {
  id: string;
  ticketNumber: string;
  vehicleNumber: string | null;
  vehicleType: VehicleType;
  enteredAt: string;
  exitedAt: string | null;
  durationMinutes: number;
  currentCost: number;
  status: 'active' | 'completed';
  tariffCode: string;
  hourlyRate: number;
  tenantId: string;
  tenantShortName: string;
  discountApplied: boolean;
};

type DiscountOperation = {
  id: string;
  parkingSessionId: string;
  tenantId: string;
  tenantShortName: string;
  ticketNumber: string;
  vehicleNumber: string | null;
  vehicleType: VehicleType;
  appliedAt: string;
  originalCost: number;
  discountPercent: number;
  guestDue: number;
  tenantCharge: number;
  status: 'applied';
  comment: string;
};

type DiscountResult = DiscountOperation;

type ApiErrorPayload = {
  error?: string;
  code?: string;
};

const commentPresets = [
  'Клиент арендатора',
  'Доставка',
  'Погрузка/разгрузка',
  'Служебный визит',
] as const;

const errorMessages: Record<string, string> = {
  DISCOUNT_ALREADY_APPLIED: 'Для этой парковочной сессии скидка уже применена.',
  SESSION_ALREADY_COMPLETED: 'Парковочная сессия уже завершена. Применить скидку нельзя.',
  PARKING_SESSION_NOT_FOUND: 'Парковочная сессия не найдена или недоступна в текущей demo-сессии.',
  INVALID_REQUEST: 'Проверьте введённые данные.',
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  if (!hours) return `${rest} мин`;
  if (!rest) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

function formatRubles(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

function vehicleTypeLabel(value: VehicleType) {
  return value === 'truck' ? 'Грузовой' : 'Легковой';
}

function sessionStatus(session: ParkingSession) {
  if (session.discountApplied) return 'discounted' as const;
  if (session.status === 'completed') return 'completed' as const;
  return 'active' as const;
}

function ParkingSessionCard({ session, onSelect }: { session: ParkingSession; onSelect: (session: ParkingSession) => void }) {
  const VehicleIcon = session.vehicleType === 'truck' ? Truck : CarFront;
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${session.discountApplied ? 'border-blue-200' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Талон</p>
          <p className="mt-1 font-mono text-lg font-bold text-slate-950">{session.ticketNumber}</p>
        </div>
        <DemoStatusBadge status={sessionStatus(session)} />
      </div>
      <div className="mt-4 grid gap-2.5 text-sm text-slate-600">
        <div className="flex min-w-0 items-center gap-2">
          <VehicleIcon aria-hidden="true" size={17} className="shrink-0 text-slate-500" />
          <span className="min-w-0 truncate font-semibold text-slate-900">
            {session.vehicleNumber || 'Номер не распознан'}
          </span>
        </div>
        <div className="flex items-center gap-2"><Clock3 aria-hidden="true" size={17} />{formatDuration(session.durationMinutes)}</div>
        <div className="flex items-center gap-2"><Banknote aria-hidden="true" size={17} /><strong className="text-slate-950">{formatRubles(session.currentCost)}</strong></div>
        <p className="truncate text-xs text-slate-500" title={session.tenantShortName}>{session.tenantShortName}</p>
      </div>
      <button
        type="button"
        onClick={() => onSelect(session)}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {session.discountApplied ? 'Посмотреть операцию' : 'Выбрать'}
      </button>
      {session.discountApplied ? <p className="mt-2 text-center text-xs font-medium text-blue-700">Уже оплачено арендатором</p> : null}
    </article>
  );
}

export default function WebDiscountPortal() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [login, setLogin] = useState('TEST');
  const [password, setPassword] = useState('TEST');
  const [loginError, setLoginError] = useState('');
  const [activeSessions, setActiveSessions] = useState<ParkingSession[]>([]);
  const [history, setHistory] = useState<DiscountOperation[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>('ticket');
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<ParkingSession[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [selected, setSelected] = useState<ParkingSession | null>(null);
  const [comment, setComment] = useState('Клиент арендатора');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [success, setSuccess] = useState<DiscountResult | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [pageError, setPageError] = useState('');
  const selectedRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const confirmTriggerRef = useRef<HTMLButtonElement>(null);

  const closeConfirmation = useCallback(() => {
    setConfirmOpen(false);
    window.requestAnimationFrame(() => confirmTriggerRef.current?.focus());
  }, []);

  async function loadActiveSessions() {
    const response = await fetch('/api/demo/parking-sessions?status=active&page=1&pageSize=10', { cache: 'no-store' });
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    const payload = (await response.json().catch(() => null)) as { items?: ParkingSession[]; error?: string } | null;
    if (!response.ok || !payload?.items) throw new Error(payload?.error || 'Не удалось загрузить активные парковочные сессии.');
    setActiveSessions(payload.items);
    return payload.items;
  }

  async function loadHistory() {
    const response = await fetch('/api/demo/web-discounts?page=1&pageSize=20', { cache: 'no-store' });
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    const payload = (await response.json().catch(() => null)) as { items?: DiscountOperation[]; error?: string } | null;
    if (!response.ok || !payload?.items) throw new Error(payload?.error || 'Не удалось загрузить историю WEB-скидок.');
    setHistory(payload.items);
    return payload.items;
  }

  async function loadPortalData() {
    setLoadingData(true);
    setPageError('');
    try {
      await Promise.all([loadActiveSessions(), loadHistory()]);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    let alive = true;
    async function initialize() {
      try {
        await Promise.all([loadActiveSessions(), loadHistory()]);
        if (alive) setAuthState('authenticated');
      } catch (error) {
        if (!alive) return;
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
          setAuthState('guest');
        } else {
          setPageError('Demo-сервер временно недоступен. Попробуйте обновить страницу.');
          setAuthState('guest');
        }
      }
    }
    initialize();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!confirmOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !applying) closeConfirmation();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [applying, closeConfirmation, confirmOpen]);

  useEffect(() => {
    if (!confirmOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmOpen]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      if (!response.ok) {
        setLoginError(payload?.error || 'Для демонстрации используйте TEST/TEST.');
        return;
      }
      setAuthState('authenticated');
      await loadPortalData();
    } catch {
      setLoginError('Demo-сервер временно недоступен.');
    }
  }

  async function handleLogout() {
    await fetch('/api/demo/session', { method: 'DELETE' }).catch(() => undefined);
    setAuthState('guest');
    setPassword('TEST');
    setActiveSessions([]);
    setHistory([]);
    setSelected(null);
    setSearchResults([]);
    setSuccess(null);
    setOperationError('');
  }

  function selectSession(session: ParkingSession) {
    setSelected(session);
    setSuccess(null);
    setOperationError('');
    window.requestAnimationFrame(() => selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchValue.trim();
    if (!query) {
      setSearchMessage(searchMode === 'ticket' ? 'Введите номер талона.' : 'Введите номер автомобиля.');
      return;
    }
    setSearching(true);
    setSearchMessage('');
    setOperationError('');
    try {
      const response = await fetch(`/api/demo/parking-sessions?${searchMode}=${encodeURIComponent(query)}&page=1&pageSize=10`, { cache: 'no-store' });
      if (response.status === 401) {
        setAuthState('guest');
        setLoginError('Сессия завершилась. Войдите повторно.');
        return;
      }
      const payload = (await response.json().catch(() => null)) as { items?: ParkingSession[]; error?: string } | null;
      if (!response.ok || !payload?.items) {
        setSearchMessage('Не удалось выполнить поиск. Попробуйте ещё раз.');
        return;
      }
      setSearchResults(payload.items);
      if (!payload.items.length) {
        setSelected(null);
        setSearchMessage('Посетитель не найден. Проверьте талон или номер автомобиля.');
        return;
      }
      setSearchMessage(`Найдено: ${payload.items.length}`);
      selectSession(payload.items[0]);
    } catch {
      setSearchMessage('Demo-сервер временно недоступен.');
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchValue('');
    setSearchResults([]);
    setSearchMessage('');
    setSelected(null);
    setSuccess(null);
    setOperationError('');
  }

  async function applyDiscount() {
    if (!selected || applying) return;
    setApplying(true);
    setOperationError('');
    try {
      const response = await fetch('/api/demo/web-discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parkingSessionId: selected.id, comment: comment.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as { discount?: DiscountResult } & ApiErrorPayload | null;
      if (response.status === 401 || payload?.code === 'UNAUTHORIZED') {
        setConfirmOpen(false);
        setAuthState('guest');
        setLoginError('Сессия завершилась. Войдите повторно.');
        return;
      }
      if (!response.ok || !payload?.discount) {
        const message = payload?.code ? errorMessages[payload.code] : undefined;
        setOperationError(message || 'Не удалось применить скидку. Попробуйте ещё раз.');
        if (payload?.code === 'DISCOUNT_ALREADY_APPLIED') {
          setSelected((current) => current ? { ...current, discountApplied: true } : current);
        }
        setConfirmOpen(false);
        return;
      }
      const result = payload.discount;
      setSuccess(result);
      setSelected((current) => current ? { ...current, discountApplied: true } : current);
      setActiveSessions((current) => current.map((item) => item.id === selected.id ? { ...item, discountApplied: true } : item));
      setSearchResults((current) => current.map((item) => item.id === selected.id ? { ...item, discountApplied: true } : item));
      setHistory((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      setConfirmOpen(false);
      await Promise.all([loadActiveSessions(), loadHistory()]);
    } catch {
      setOperationError('Demo-сервер временно недоступен. Попробуйте ещё раз.');
      setConfirmOpen(false);
    } finally {
      setApplying(false);
    }
  }

  function startNextGuest() {
    setSelected(null);
    setSuccess(null);
    setOperationError('');
    setSearchValue('');
    setSearchResults([]);
    setSearchMessage('');
    setComment('Клиент арендатора');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section aria-labelledby="web-discount-portal-title" className="mt-6 scroll-mt-[144px] sm:mt-10 lg:scroll-mt-[100px]">
      <div className="mb-5 sm:mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 sm:text-sm">WEB-скидки · рабочий прототип</p>
        <h2 id="web-discount-portal-title" className="mt-2 text-[1.5rem] font-bold leading-[1.15] tracking-tight text-slate-950 sm:text-3xl">
          Парковка гостей за счёт арендатора
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Интерфейс ниже показан внутри условного браузера арендатора. Все посетители, талоны, автомобили и начисления синтетические.
        </p>
      </div>

      <DemoBrowserFrame
        previewLabel="Предпросмотр оплаты парковки гостей в браузере арендатора"
        address="www.роспарк.рф/demo/web-skidki"
      >
        {authState === 'checking' ? (
          <div className="flex min-h-[520px] items-center justify-center bg-white" role="status" aria-live="polite">
            <div className="text-center text-slate-600">
              <Loader2 aria-hidden="true" size={30} className="mx-auto animate-spin text-blue-600" />
              <p className="mt-3 font-medium">Проверяем demo-сессию…</p>
            </div>
          </div>
        ) : null}

        {authState === 'guest' ? (
          <div className="grid min-h-[640px] bg-white lg:grid-cols-[1.08fr_0.92fr]" data-testid="web-discount-login">
            <div className="relative hidden min-h-full overflow-hidden bg-slate-950 lg:block">
              <Image
                src="/images/demo/bc-severnaya-bashnya.webp"
                alt="Въезд на демонстрационную парковку"
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover opacity-65"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-10 text-white">
                <div className="inline-flex rounded-2xl bg-white/10 p-3 backdrop-blur"><BadgePercent aria-hidden="true" size={28} /></div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Комплекс «Северная башня»</p>
                <h3 className="mt-3 max-w-xl text-3xl font-bold leading-tight">Посетитель уже на парковке</h3>
                <p className="mt-4 max-w-lg leading-7 text-slate-200">Найдите активную сессию и компенсируйте парковку за счёт арендатора без кассы и бумажных талонов.</p>
              </div>
            </div>

            <div className="flex items-center justify-center p-5 sm:p-10 lg:p-12">
              <form onSubmit={handleLogin} className="w-full max-w-md" noValidate data-testid="login-form">
                <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700"><KeyRound aria-hidden="true" size={26} /></div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Комплекс «Северная башня»</p>
                <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Вход для арендатора</h3>
                <p className="mt-3 leading-7 text-slate-600">После входа откроются активные парковочные сессии и история скидок.</p>
                <div className="mt-8 grid gap-5">
                  <label htmlFor="web-demo-login" className="grid gap-2 text-sm font-semibold text-slate-800">
                    Логин
                    <input id="web-demo-login" value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </label>
                  <label htmlFor="web-demo-password" className="grid gap-2 text-sm font-semibold text-slate-800">
                    Пароль
                    <input id="web-demo-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="min-h-12 rounded-xl border border-slate-300 px-4 text-base font-normal text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </label>
                </div>
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Демо-доступ: логин <strong>TEST</strong>, пароль <strong>TEST</strong>.
                </div>
                {pageError ? <p role="alert" className="mt-4 text-sm font-medium text-rose-700">{pageError}</p> : null}
                {loginError ? <p role="alert" className="mt-4 text-sm font-medium text-rose-700">{loginError}</p> : null}
                <button type="submit" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                  Войти в кабинет <Check aria-hidden="true" size={18} />
                </button>
                <p className="mt-5 text-center text-xs leading-5 text-slate-500">Демонстрационный режим. В рабочей системе доступы и права арендаторов настраиваются индивидуально.</p>
              </form>
            </div>
          </div>
        ) : null}

        {authState === 'authenticated' ? (
          <div className="min-h-[760px] bg-slate-50">
            <DemoCabinetHeader
              active="web-discounts"
              objectName="Комплекс «Северная башня»"
              role="Кабинет арендатора"
              onLogout={handleLogout}
            />

            <div className="p-4 sm:p-7 lg:p-9">
              <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-5 sm:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">WEB-скидка · 100%</p>
                    <h3 className="mt-2 text-[1.625rem] font-bold leading-tight text-slate-950 sm:text-3xl">Посетитель уже въехал</h3>
                    <p className="mt-3 leading-7 text-slate-600">Найдите его по талону или номеру автомобиля и оплатите парковку за счёт арендатора.</p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-2 text-sm">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs text-slate-500">Легковой</p><p className="mt-1 font-bold text-slate-950">100 ₽/час</p></div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><p className="text-xs text-slate-500">Грузовой</p><p className="mt-1 font-bold text-slate-950">250 ₽/час</p></div>
                  </div>
                </div>
                <p className="mt-5 rounded-xl bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-200">Это demo: списание денег, открытие шлагбаума и реальные платежи не выполняются.</p>
              </section>

              <div className="mt-6 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
                <section className="scroll-mt-[144px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:scroll-mt-[100px]" aria-labelledby="search-title">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Search aria-hidden="true" size={21} /></span>
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Шаг 1</p><h4 id="search-title" className="font-bold text-slate-950">Найти посетителя</h4></div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Режим поиска">
                    <button type="button" aria-pressed={searchMode === 'ticket'} onClick={() => { setSearchMode('ticket'); clearSearch(); }} className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${searchMode === 'ticket' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>По талону</button>
                    <button type="button" aria-pressed={searchMode === 'vehicle'} onClick={() => { setSearchMode('vehicle'); clearSearch(); }} className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${searchMode === 'vehicle' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>По автомобилю</button>
                  </div>
                  <form onSubmit={handleSearch} className="mt-5" role="search">
                    <label htmlFor="parking-search" className="text-sm font-semibold text-slate-800">
                      {searchMode === 'ticket' ? 'Номер талона' : 'Государственный номер автомобиля'}
                    </label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                      <input
                        id="parking-search"
                        data-testid="parking-search"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder={searchMode === 'ticket' ? 'Например: D-1042' : 'Например: А104ВС77'}
                        className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 text-base uppercase text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                      <button type="submit" disabled={searching} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70">
                        {searching ? <Loader2 aria-hidden="true" size={18} className="animate-spin" /> : <Search aria-hidden="true" size={18} />}
                        Найти
                      </button>
                    </div>
                  </form>
                  <div className="mt-3 min-h-6 text-sm" aria-live="polite">
                    {searchMessage ? <p className={searchResults.length ? 'text-emerald-700' : 'text-slate-600'}>{searchMessage}</p> : null}
                  </div>
                  {searchResults.length ? (
                    <div className="mt-3 grid gap-3">
                      {searchResults.map((session) => <ParkingSessionCard key={session.id} session={session} onSelect={selectSession} />)}
                    </div>
                  ) : null}
                  {(searchValue || searchResults.length) ? (
                    <button type="button" onClick={clearSearch} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700"><X aria-hidden="true" size={16} />Очистить поиск</button>
                  ) : null}
                </section>

                <section className="scroll-mt-[144px] lg:scroll-mt-[100px]" aria-labelledby="active-sessions-title" data-testid="active-sessions">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Выберите пример</p><h4 id="active-sessions-title" className="mt-1 text-[1.5rem] font-bold leading-tight text-slate-950 sm:text-xl">Активные посетители</h4></div>
                    <p className="text-sm text-slate-500">Показано {activeSessions.length}</p>
                  </div>
                  {loadingData ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Loader2 aria-hidden="true" size={17} className="animate-spin" />Обновляем список…</p> : null}
                  {activeSessions.length ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {activeSessions.map((session) => <ParkingSessionCard key={session.id} session={session} onSelect={selectSession} />)}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><SearchX aria-hidden="true" size={28} className="mx-auto text-slate-400" /><p className="mt-3 font-semibold text-slate-900">Активных сессий нет</p></div>
                  )}
                </section>
              </div>

              {selected ? (
                <div ref={selectedRef} className="scroll-mt-[144px] pt-7 lg:scroll-mt-[100px]" data-testid="selected-session">
                  <section className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-white shadow-[0_18px_50px_rgba(37,99,235,0.12)]" aria-labelledby="selected-session-title">
                    <div className="flex flex-col gap-4 bg-slate-950 px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-7">
                      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">Шаг 2 · Выбранный посетитель</p><h4 id="selected-session-title" className="mt-2 font-mono text-[1.5rem] font-bold leading-tight sm:text-2xl">Талон {selected.ticketNumber}</h4></div>
                      <DemoStatusBadge status={sessionStatus(selected)} />
                    </div>
                    <div className="grid lg:grid-cols-[1fr_320px]">
                      <dl className="grid gap-x-7 gap-y-5 p-5 text-sm sm:grid-cols-2 sm:p-7">
                        <div><dt className="text-slate-500">Арендатор</dt><dd className="mt-1 font-semibold text-slate-950">{selected.tenantShortName}</dd></div>
                        <div><dt className="text-slate-500">Номер талона</dt><dd className="mt-1 font-mono font-bold text-slate-950">{selected.ticketNumber}</dd></div>
                        <div><dt className="text-slate-500">Автомобиль</dt><dd className="mt-1 font-semibold text-slate-950">{selected.vehicleNumber || 'Номер автомобиля не распознан'}</dd></div>
                        <div><dt className="text-slate-500">Тип транспорта</dt><dd className="mt-1 font-semibold text-slate-950">{vehicleTypeLabel(selected.vehicleType)}</dd></div>
                        <div><dt className="text-slate-500">Время въезда</dt><dd className="mt-1 font-semibold text-slate-950">{formatDateTime(selected.enteredAt)}</dd></div>
                        <div><dt className="text-slate-500">На парковке</dt><dd className="mt-1 font-semibold text-slate-950">{formatDuration(selected.durationMinutes)}</dd></div>
                        <div><dt className="text-slate-500">Demo-тариф</dt><dd className="mt-1 font-semibold text-slate-950">{formatRubles(selected.hourlyRate)} за начатый час</dd></div>
                        <div><dt className="text-slate-500">Текущая стоимость</dt><dd className="mt-1 text-xl font-bold text-blue-700">{formatRubles(selected.currentCost)}</dd></div>
                      </dl>
                      <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-7 lg:border-l lg:border-t-0">
                        <label htmlFor="discount-comment" className="text-sm font-semibold text-slate-800">Комментарий <span className="font-normal text-slate-500">· необязательно</span></label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {commentPresets.map((preset) => (
                            <button key={preset} type="button" onClick={() => setComment(preset)} aria-pressed={comment === preset} className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold ${comment === preset ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-600 hover:border-blue-300'}`}>{preset}</button>
                          ))}
                          <button type="button" onClick={() => setComment('')} aria-pressed={!comment} className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold ${!comment ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-600 hover:border-blue-300'}`}>Другое</button>
                        </div>
                        <textarea id="discount-comment" value={comment} onChange={(event) => setComment(event.target.value.slice(0, 300))} rows={3} className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Например, клиент арендатора" />
                        <button
                          ref={confirmTriggerRef}
                          type="button"
                          onClick={() => { setOperationError(''); setConfirmOpen(true); }}
                          disabled={selected.discountApplied || selected.status === 'completed'}
                          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                        >
                          <BadgePercent aria-hidden="true" size={19} />
                          {selected.discountApplied ? 'Оплачено арендатором' : selected.status === 'completed' ? 'Сессия завершена' : 'Оплатить парковку гостя'}
                        </button>
                        <p className="mt-3 text-xs leading-5 text-slate-500">Гость заплатит 0 ₽. Стоимость будет начислена арендатору.</p>
                      </div>
                    </div>
                    <p className="border-t border-slate-200 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-7">Итоговая сумма фиксируется сервером в момент применения скидки и может измениться при переходе на следующий оплачиваемый час.</p>
                  </section>
                </div>
              ) : null}

              {operationError ? <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{operationError}</div> : null}

              {success ? (
                <section data-testid="discount-success" className="mt-7 scroll-mt-[144px] overflow-hidden rounded-3xl border-2 border-emerald-200 bg-white shadow-[0_18px_50px_rgba(5,150,105,0.12)] lg:scroll-mt-[100px]" aria-labelledby="success-title">
                  <div className="bg-emerald-600 px-5 py-7 text-white sm:px-7">
                    <CheckCircle2 aria-hidden="true" size={34} />
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-100">Операция выполнена</p>
                    <h4 id="success-title" className="mt-2 text-[1.625rem] font-bold leading-tight sm:text-3xl">Парковка гостя оплачена</h4>
                  </div>
                  <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2 sm:p-7 lg:grid-cols-5">
                    <div><dt className="text-slate-500">Исходная стоимость</dt><dd className="mt-1 font-bold text-slate-950">{formatRubles(success.originalCost)}</dd></div>
                    <div><dt className="text-slate-500">Скидка 100%</dt><dd className="mt-1 font-bold text-emerald-700">−{formatRubles(success.originalCost)}</dd></div>
                    <div><dt className="text-slate-500">К оплате гостю</dt><dd className="mt-1 text-xl font-bold text-emerald-700">0 ₽</dd></div>
                    <div><dt className="text-slate-500">Начислено арендатору</dt><dd className="mt-1 font-bold text-slate-950">{formatRubles(success.tenantCharge)}</dd></div>
                    <div><dt className="text-slate-500">Время операции</dt><dd className="mt-1 font-semibold text-slate-950">{formatDateTime(success.appliedAt)}</dd></div>
                  </dl>
                  <div className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:p-7">
                    <button type="button" onClick={startNextGuest} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 font-semibold text-white hover:bg-slate-800"><Search aria-hidden="true" size={18} />Найти следующего гостя</button>
                    <button type="button" onClick={() => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 font-semibold text-slate-900 hover:bg-slate-50"><History aria-hidden="true" size={18} />Посмотреть историю операций</button>
                  </div>
                </section>
              ) : null}

              <section ref={historyRef} className="scroll-mt-[144px] pt-9 lg:scroll-mt-[100px]" aria-labelledby="history-title" data-testid="discount-history">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">История demo-сессии</p><h4 id="history-title" className="mt-1 text-[1.5rem] font-bold leading-tight text-slate-950 sm:text-[1.875rem]">Последние оплаченные парковки</h4></div>
                  <p className="text-sm text-slate-500">До 20 последних операций</p>
                </div>
                {history.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {history.map((operation) => (
                      <article key={operation.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs text-slate-500">{formatDateTime(operation.appliedAt)}</p><p className="mt-1 font-mono text-lg font-bold text-slate-950">{operation.ticketNumber}</p></div><DemoStatusBadge status="discounted" /></div>
                        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                          <div><dt className="text-slate-500">Автомобиль</dt><dd className="mt-0.5 font-semibold text-slate-950">{operation.vehicleNumber || 'Номер не распознан'}</dd></div>
                          <div><dt className="text-slate-500">Арендатор</dt><dd className="mt-0.5 font-semibold text-slate-950">{operation.tenantShortName}</dd></div>
                          <div><dt className="text-slate-500">Исходная стоимость</dt><dd className="mt-0.5 font-semibold text-slate-950">{formatRubles(operation.originalCost)}</dd></div>
                          <div><dt className="text-slate-500">Начислено арендатору</dt><dd className="mt-0.5 font-bold text-blue-700">{formatRubles(operation.tenantCharge)}</dd></div>
                          <div><dt className="text-slate-500">Скидка 100%</dt><dd className="mt-0.5 font-semibold text-emerald-700">К оплате гостю — 0 ₽</dd></div>
                          <div><dt className="text-slate-500">Комментарий</dt><dd className="mt-0.5 font-medium text-slate-700">{operation.comment || 'Без комментария'}</dd></div>
                        </dl>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><History aria-hidden="true" size={30} className="mx-auto text-slate-400" /><p className="mt-3 font-semibold text-slate-900">Оплаченных парковок пока нет</p><p className="mt-1 text-sm text-slate-600">Первая применённая скидка появится здесь.</p></div>
                )}
              </section>

              <div className="mt-8 grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4"><BadgePercent aria-hidden="true" size={20} className="text-blue-700" /><p className="mt-2 font-semibold text-slate-900">Скидка 100%</p><p className="mt-1">Гость платит 0 ₽, исходная стоимость сохраняется в операции.</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4"><PackageCheck aria-hidden="true" size={20} className="text-blue-700" /><p className="mt-2 font-semibold text-slate-900">Серверный расчёт</p><p className="mt-1">Браузер не передаёт сумму, тариф или арендатора.</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4"><Ticket aria-hidden="true" size={20} className="text-blue-700" /><p className="mt-2 font-semibold text-slate-900">Изоляция demo</p><p className="mt-1">Другой браузер не видит созданные здесь операции.</p></div>
              </div>
            </div>
          </div>
        ) : null}
      </DemoBrowserFrame>

      {confirmOpen && selected ? (
        <div
          className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => { if (event.currentTarget === event.target && !applying) closeConfirmation(); }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7" data-testid="payment-confirmation">
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700"><BadgePercent aria-hidden="true" size={25} /></div>
              <button type="button" onClick={closeConfirmation} disabled={applying} aria-label="Закрыть подтверждение" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X aria-hidden="true" size={20} /></button>
            </div>
            <h3 id="confirm-title" className="mt-5 text-[1.5rem] font-bold leading-tight text-slate-950 sm:text-[1.75rem]">Подтвердить оплату парковки на сумму {formatRubles(selected.currentCost)}?</h3>
            <p className="mt-3 leading-7 text-slate-600">Гость заплатит 0 ₽. Итоговая стоимость будет рассчитана сервером и начислена арендатору.</p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Талон</span><strong className="font-mono text-slate-950">{selected.ticketNumber}</strong></div>
              <div className="mt-2 flex justify-between gap-4"><span className="text-slate-500">Автомобиль</span><strong className="text-right text-slate-950">{selected.vehicleNumber || 'Не распознан'}</strong></div>
              <div className="mt-2 flex justify-between gap-4"><span className="text-slate-500">Комментарий</span><strong className="text-right text-slate-950">{comment.trim() || 'Без комментария'}</strong></div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={closeConfirmation} disabled={applying} className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60">Отмена</button>
              <button type="button" onClick={applyDiscount} disabled={applying} autoFocus className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70">
                {applying ? <Loader2 aria-hidden="true" size={18} className="animate-spin" /> : <Check aria-hidden="true" size={18} />}
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
