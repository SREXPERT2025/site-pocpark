'use client';

import { BadgePercent, BarChart3, Building2, CalendarRange, ClipboardList, ListChecks } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import DemoCabinetHeader from '@/app/components/demo/DemoCabinetHeader';
import OwnerPeriodSwitcher from './OwnerPeriodSwitcher';
import type { OwnerPeriod, OwnerPeriodMode } from './owner-types';

export type OwnerCabinetTab = 'overview' | 'tenants' | 'guest-requests' | 'parking-payments' | 'operations';

type OwnerCabinetShellProps = {
  activeTab: OwnerCabinetTab;
  periodMode: OwnerPeriodMode;
  period: OwnerPeriod | null;
  busy: boolean;
  children: ReactNode;
  onTabChange: (tab: OwnerCabinetTab) => void;
  onPeriodChange: (period: OwnerPeriodMode) => void;
  onLogout: () => void;
};

const tabs: Array<{ id: OwnerCabinetTab; label: string; icon: typeof BarChart3 }> = [
  { id: 'overview', label: 'Обзор', icon: BarChart3 },
  { id: 'tenants', label: 'Арендаторы', icon: Building2 },
  { id: 'guest-requests', label: 'Гостевые заявки', icon: ClipboardList },
  { id: 'parking-payments', label: 'Оплата парковки гостей', icon: BadgePercent },
  { id: 'operations', label: 'Все операции', icon: ListChecks },
];

export default function OwnerCabinetShell({
  activeTab,
  periodMode,
  period,
  busy,
  children,
  onTabChange,
  onPeriodChange,
  onLogout,
}: OwnerCabinetShellProps) {
  const tabScrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = tabScrollerRef.current;
    const activeButton = document.getElementById(`owner-tab-${activeTab}`);
    if (!scroller || !activeButton) return;
    const targetLeft = activeButton.offsetLeft - ((scroller.clientWidth - activeButton.offsetWidth) / 2);
    scroller.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeTab]);

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    const next = tabs[nextIndex];
    onTabChange(next.id);
    window.requestAnimationFrame(() => document.getElementById(`owner-tab-${next.id}`)?.focus());
  }

  return (
    <div className="min-h-[760px] bg-slate-50">
      <DemoCabinetHeader
        active="owner"
        objectName="Демо-комплекс РОСПАРК"
        role="Владелец парковки"
        onLogout={onLogout}
      />

      <div className="p-4 sm:p-7 lg:p-9">
        <section className="scroll-mt-[144px] rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-5 sm:p-7 lg:scroll-mt-[100px]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Кабинет владельца парковки</p>
              <h2 className="mt-2 text-[1.625rem] font-bold leading-tight text-slate-950 sm:text-3xl">
                Парковка и расчёты в одном окне
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                Сводка по гостевым проездам, оплате парковки и начислениям каждому арендатору.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              <CalendarRange aria-hidden="true" className="mt-0.5 shrink-0 text-blue-700" size={20} />
              <p><strong className="block text-slate-950">Только demo-данные</strong>Реальные платежи и списания не выполняются.</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div>
            <div ref={tabScrollerRef} className="max-w-full overflow-x-auto pb-1 [scrollbar-width:thin]">
              <div
                role="tablist"
                aria-label="Разделы кабинета владельца"
                onKeyDown={handleTabKeyDown}
                className="inline-flex min-w-max rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const selected = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      id={`owner-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`owner-panel-${tab.id}`}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => onTabChange(tab.id)}
                      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${selected ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                    >
                      <Icon aria-hidden="true" size={17} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Сводка и детальные реестры используют один выбранный отчётный период.</p>
          </div>

          <OwnerPeriodSwitcher
            value={periodMode}
            period={period}
            busy={busy}
            onChange={onPeriodChange}
          />
        </div>

        <div
          id={`owner-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`owner-tab-${activeTab}`}
          className="mt-6 scroll-mt-[144px] lg:scroll-mt-[100px]"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
