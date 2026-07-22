'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import DemoBrowserFrame from '@/app/components/demo/DemoBrowserFrame';
import OwnerCabinetShell, { type OwnerCabinetTab } from '@/app/components/demo/owner/OwnerCabinetShell';
import OwnerLoginView from '@/app/components/demo/owner/OwnerLoginView';
import OwnerOverview from '@/app/components/demo/owner/OwnerOverview';
import OwnerTenantDrawer from '@/app/components/demo/owner/OwnerTenantDrawer';
import OwnerTenantTable from '@/app/components/demo/owner/OwnerTenantTable';
import type {
  OwnerObjectType,
  OwnerOperationsResponse,
  OwnerPeriodMode,
  OwnerSummary,
  OwnerTenant,
  OwnerTenantDetail,
  OwnerTenantsResponse,
  OwnerTenantSort,
  SortOrder,
} from '@/app/components/demo/owner/owner-types';

type AuthState = 'checking' | 'guest' | 'authenticated';

class OwnerClientError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function readOwnerResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
  if (!response.ok || !payload) {
    throw new OwnerClientError(
      response.status,
      payload?.code || 'INTERNAL_ERROR',
      payload?.error || 'Не удалось загрузить данные кабинета.',
    );
  }
  return payload;
}

function ownerErrorMessage(error: unknown) {
  if (error instanceof OwnerClientError) {
    if (error.code === 'INVALID_QUERY') return 'Параметры отчёта устарели. Сбросьте фильтры и повторите запрос.';
    if (error.code === 'TENANT_NOT_FOUND') return 'Арендатор не найден в демонстрационном справочнике.';
  }
  return 'Не удалось загрузить demo-отчёт. Попробуйте ещё раз.';
}

const emptyTenants: OwnerTenantsResponse = {
  period: { from: '', toExclusive: '', timezone: 'Europe/Moscow', label: '' },
  items: [],
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
};

export default function OwnerParkingPortal() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [login, setLogin] = useState('TEST');
  const [password, setPassword] = useState('TEST');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<OwnerCabinetTab>('overview');
  const [periodMode, setPeriodMode] = useState<OwnerPeriodMode>('previous-month');

  const [summary, setSummary] = useState<OwnerSummary | null>(null);
  const [overviewTenants, setOverviewTenants] = useState<OwnerTenant[]>([]);
  const [recentOperations, setRecentOperations] = useState<OwnerOperationsResponse['items']>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  const [tenantList, setTenantList] = useState<OwnerTenantsResponse>(emptyTenants);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantError, setTenantError] = useState('');
  const [tenantPage, setTenantPage] = useState(1);
  const [objectType, setObjectType] = useState<OwnerObjectType | ''>('');
  const [tenantSort, setTenantSort] = useState<OwnerTenantSort>('totalAmount');
  const [tenantOrder, setTenantOrder] = useState<SortOrder>('desc');

  const [drawerTenantId, setDrawerTenantId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<OwnerTenantDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState('');
  const [drawerTrigger, setDrawerTrigger] = useState<HTMLElement | null>(null);

  const overviewAbortRef = useRef<AbortController | null>(null);
  const tenantsAbortRef = useRef<AbortController | null>(null);
  const drawerAbortRef = useRef<AbortController | null>(null);
  const overviewGenerationRef = useRef(0);
  const tenantGenerationRef = useRef(0);
  const drawerGenerationRef = useRef(0);

  const handleUnauthorized = useCallback(() => {
    setAuthState('guest');
    setLoginError('Demo-сессия завершилась. Войдите повторно.');
    setSummary(null);
    setOverviewTenants([]);
    setRecentOperations([]);
    setTenantList(emptyTenants);
    setDrawerTenantId(null);
    setDrawerDetail(null);
  }, []);

  const loadOverview = useCallback(async (mode: OwnerPeriodMode, initial = false) => {
    overviewAbortRef.current?.abort();
    const controller = new AbortController();
    overviewAbortRef.current = controller;
    const generation = ++overviewGenerationRef.current;
    setOverviewLoading(true);
    setOverviewError('');

    try {
      const query = `period=${encodeURIComponent(mode)}`;
      const [summaryResponse, tenantsResponse, operationsResponse] = await Promise.all([
        fetch(`/api/demo/owner/summary?${query}`, { cache: 'no-store', signal: controller.signal }),
        fetch(`/api/demo/owner/tenants?${query}&page=1&pageSize=100&sort=totalAmount&order=desc`, { cache: 'no-store', signal: controller.signal }),
        fetch(`/api/demo/owner/operations?${query}&page=1&pageSize=20&sort=enteredAt&order=desc`, { cache: 'no-store', signal: controller.signal }),
      ]);
      if ([summaryResponse, tenantsResponse, operationsResponse].some((response) => response.status === 401)) {
        throw new OwnerClientError(401, 'UNAUTHORIZED', 'Demo-сессия завершилась.');
      }
      const [nextSummary, nextTenants, nextOperations] = await Promise.all([
        readOwnerResponse<OwnerSummary>(summaryResponse),
        readOwnerResponse<OwnerTenantsResponse>(tenantsResponse),
        readOwnerResponse<OwnerOperationsResponse>(operationsResponse),
      ]);
      if (controller.signal.aborted || generation !== overviewGenerationRef.current) return;

      const firstSix = nextOperations.items.slice(0, 6);
      const presentTypes = new Set(firstSix.map((operation) => operation.operationType));
      const opposite = nextOperations.items.find((operation) => !presentTypes.has(operation.operationType));
      const displayOperations = opposite && firstSix.length === 6
        ? [...firstSix.slice(0, 5), opposite]
        : firstSix;

      setSummary(nextSummary);
      setOverviewTenants(nextTenants.items);
      setRecentOperations(displayOperations);
      setAuthState('authenticated');
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof OwnerClientError && error.status === 401) {
        if (initial) setLoginError('');
        handleUnauthorized();
        return;
      }
      setOverviewError(ownerErrorMessage(error));
      if (initial) setAuthState('guest');
    } finally {
      if (!controller.signal.aborted && generation === overviewGenerationRef.current) setOverviewLoading(false);
    }
  }, [handleUnauthorized]);

  const loadTenants = useCallback(async () => {
    tenantsAbortRef.current?.abort();
    const controller = new AbortController();
    tenantsAbortRef.current = controller;
    const generation = ++tenantGenerationRef.current;
    setTenantLoading(true);
    setTenantError('');
    try {
      const params = new URLSearchParams({
        period: periodMode,
        page: String(tenantPage),
        pageSize: '10',
        sort: tenantSort,
        order: tenantOrder,
      });
      if (objectType) params.set('objectType', objectType);
      const response = await fetch(`/api/demo/owner/tenants?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (response.status === 401) throw new OwnerClientError(401, 'UNAUTHORIZED', 'Demo-сессия завершилась.');
      const payload = await readOwnerResponse<OwnerTenantsResponse>(response);
      if (controller.signal.aborted || generation !== tenantGenerationRef.current) return;
      setTenantList(payload);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof OwnerClientError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setTenantError(ownerErrorMessage(error));
    } finally {
      if (!controller.signal.aborted && generation === tenantGenerationRef.current) setTenantLoading(false);
    }
  }, [handleUnauthorized, objectType, periodMode, tenantOrder, tenantPage, tenantSort]);

  const loadTenantDetail = useCallback(async (tenantId: string) => {
    drawerAbortRef.current?.abort();
    const controller = new AbortController();
    drawerAbortRef.current = controller;
    const generation = ++drawerGenerationRef.current;
    setDrawerLoading(true);
    setDrawerError('');
    setDrawerDetail(null);
    try {
      const response = await fetch(`/api/demo/owner/tenants/${encodeURIComponent(tenantId)}?period=${encodeURIComponent(periodMode)}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (response.status === 401) throw new OwnerClientError(401, 'UNAUTHORIZED', 'Demo-сессия завершилась.');
      const payload = await readOwnerResponse<OwnerTenantDetail>(response);
      if (controller.signal.aborted || generation !== drawerGenerationRef.current) return;
      setDrawerDetail(payload);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof OwnerClientError && error.status === 401) {
        handleUnauthorized();
        return;
      }
      setDrawerError(ownerErrorMessage(error));
    } finally {
      if (!controller.signal.aborted && generation === drawerGenerationRef.current) setDrawerLoading(false);
    }
  }, [handleUnauthorized, periodMode]);

  useEffect(() => {
    void loadOverview('previous-month', true);
    return () => {
      overviewAbortRef.current?.abort();
      tenantsAbortRef.current?.abort();
      drawerAbortRef.current?.abort();
    };
  }, [loadOverview]);

  useEffect(() => {
    if (authState !== 'authenticated' || activeTab !== 'tenants') return;
    void loadTenants();
  }, [activeTab, authState, loadTenants]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError('');
    try {
      const response = await fetch('/api/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setLoginError(payload?.error || 'Для демонстрации используйте TEST/TEST.');
        return;
      }
      setAuthState('authenticated');
      await loadOverview(periodMode);
    } catch {
      setLoginError('Demo-сервер временно недоступен.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    overviewAbortRef.current?.abort();
    tenantsAbortRef.current?.abort();
    drawerAbortRef.current?.abort();
    await fetch('/api/demo/session', { method: 'DELETE' }).catch(() => undefined);
    setAuthState('guest');
    setPassword('TEST');
    setLoginError('');
    setSummary(null);
    setOverviewTenants([]);
    setRecentOperations([]);
    setTenantList(emptyTenants);
    setDrawerTenantId(null);
    setDrawerDetail(null);
  }

  function handlePeriodChange(mode: OwnerPeriodMode) {
    if (mode === periodMode) return;
    tenantsAbortRef.current?.abort();
    drawerAbortRef.current?.abort();
    tenantGenerationRef.current += 1;
    drawerGenerationRef.current += 1;
    setPeriodMode(mode);
    setTenantPage(1);
    setDrawerTenantId(null);
    setDrawerDetail(null);
    setSummary(null);
    setOverviewTenants([]);
    setRecentOperations([]);
    setTenantList(emptyTenants);
    void loadOverview(mode);
  }

  function handleTabChange(tab: OwnerCabinetTab) {
    setActiveTab(tab);
    if (tab === 'tenants') setTenantPage(1);
  }

  function openTenant(tenantId: string, trigger: HTMLElement) {
    setDrawerTrigger(trigger);
    setDrawerTenantId(tenantId);
    void loadTenantDetail(tenantId);
  }

  function closeDrawer() {
    drawerAbortRef.current?.abort();
    setDrawerTenantId(null);
    setDrawerDetail(null);
    setDrawerError('');
  }

  return (
    <section aria-labelledby="owner-portal-title" className="mt-6 scroll-mt-[144px] sm:mt-10 lg:scroll-mt-[100px]">
      <div className="mb-5 sm:mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 sm:text-sm">Рабочий прототип · другая роль</p>
        <h2 id="owner-portal-title" className="mt-2 text-[1.5rem] font-bold leading-[1.15] tracking-tight text-slate-950 sm:text-3xl">
          Кабинет владельца парковки
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Интерфейс ниже показан внутри условного браузера. Все данные полностью синтетические и предназначены только для демонстрации.
        </p>
      </div>

      <DemoBrowserFrame
        previewLabel="Предпросмотр кабинета владельца парковки в браузере"
        address="www.роспарк.рф/demo/vladelec-parkovki"
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
          <OwnerLoginView
            login={login}
            password={password}
            error={loginError}
            busy={loginBusy}
            onLoginChange={setLogin}
            onPasswordChange={setPassword}
            onSubmit={handleLogin}
          />
        ) : null}

        {authState === 'authenticated' ? (
          <OwnerCabinetShell
            activeTab={activeTab}
            periodMode={periodMode}
            period={summary?.period || (tenantList.period.label ? tenantList.period : null)}
            busy={overviewLoading || tenantLoading}
            onTabChange={handleTabChange}
            onPeriodChange={handlePeriodChange}
            onLogout={handleLogout}
          >
            {activeTab === 'overview' ? (
              <OwnerOverview
                mode={periodMode}
                summary={summary}
                tenants={overviewTenants}
                operations={recentOperations}
                loading={overviewLoading}
                error={overviewError}
                onRetry={() => void loadOverview(periodMode)}
                onOpenTenant={openTenant}
              />
            ) : (
              <OwnerTenantTable
                items={tenantList.items}
                total={tenantList.total}
                page={tenantList.page || tenantPage}
                pageSize={tenantList.pageSize || 10}
                totalPages={tenantList.totalPages}
                period={tenantList.period.label ? tenantList.period : summary?.period || null}
                objectType={objectType}
                sort={tenantSort}
                order={tenantOrder}
                loading={tenantLoading}
                error={tenantError}
                onObjectTypeChange={(value) => { setObjectType(value); setTenantPage(1); }}
                onSortChange={(value) => { setTenantSort(value); setTenantPage(1); }}
                onOrderChange={(value) => { setTenantOrder(value); setTenantPage(1); }}
                onPageChange={setTenantPage}
                onOpenTenant={openTenant}
                onRetry={() => void loadTenants()}
              />
            )}
          </OwnerCabinetShell>
        ) : null}
      </DemoBrowserFrame>

      <OwnerTenantDrawer
        open={Boolean(drawerTenantId)}
        detail={drawerDetail}
        loading={drawerLoading}
        error={drawerError}
        returnFocusTo={drawerTrigger}
        onClose={closeDrawer}
        onRetry={() => { if (drawerTenantId) void loadTenantDetail(drawerTenantId); }}
      />
    </section>
  );
}
