'use client';

import { BadgePercent, BarChart3, Building2, CalendarRange, ChevronDown, ClipboardList, ListChecks } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
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
  const mobileSelectId = useId();
  const mobileMenuId = `${mobileSelectId}-menu`;
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? 'Обзор';

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function closeOnOutsidePointer(event: MouseEvent | TouchEvent) {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMobileMenuOpen(false);
      mobileTriggerRef.current?.focus();
    }

    document.addEventListener('mousedown', closeOnOutsidePointer);
    document.addEventListener('touchstart', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer);
      document.removeEventListener('touchstart', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

  function focusMobileOption(index: number) {
    requestAnimationFrame(() => {
      const options = mobileMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
      options?.[index]?.focus();
    });
  }

  function openMobileMenu(direction: 'first' | 'last' | 'selected' = 'selected') {
    setMobileMenuOpen(true);
    const selectedIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
    focusMobileOption(direction === 'first' ? 0 : direction === 'last' ? tabs.length - 1 : selectedIndex);
  }

  function handleMobileTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMobileMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openMobileMenu('last');
    }
  }

  function handleMobileMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = Array.from(
      mobileMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    if (!options.length) return;
    const currentIndex = Math.max(0, options.indexOf(document.activeElement as HTMLButtonElement));
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1) % options.length
          : (currentIndex - 1 + options.length) % options.length;
    options[nextIndex]?.focus();
  }

  function chooseMobileTab(tab: OwnerCabinetTab) {
    onTabChange(tab);
    setMobileMenuOpen(false);
    requestAnimationFrame(() => mobileTriggerRef.current?.focus());
  }

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

        <div className="mt-6">
          <div className="md:hidden">
            <p
              id={mobileSelectId}
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
            >
              Раздел кабинета
            </p>
            <div ref={mobileMenuRef} className="relative">
              <button
                ref={mobileTriggerRef}
                type="button"
                aria-labelledby={mobileSelectId}
                aria-haspopup="listbox"
                aria-expanded={mobileMenuOpen}
                aria-controls={mobileMenuId}
                onClick={() => (mobileMenuOpen ? setMobileMenuOpen(false) : openMobileMenu())}
                onKeyDown={handleMobileTriggerKeyDown}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-base font-semibold text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <span>{activeTabLabel}</span>
                <ChevronDown
                  aria-hidden="true"
                  size={20}
                  className={`shrink-0 text-slate-500 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileMenuOpen ? (
                <div
                  id={mobileMenuId}
                  role="listbox"
                  aria-labelledby={mobileSelectId}
                  onKeyDown={handleMobileMenuKeyDown}
                  className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                  {tabs.map((tab) => {
                    const selected = tab.id === activeTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => chooseMobileTab(tab.id)}
                        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500 ${selected ? 'bg-slate-950 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span>{tab.label}</span>
                        {selected ? <span className="text-xs font-medium">Выбран</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <div
                role="tablist"
                aria-label="Разделы кабинета владельца"
                onKeyDown={handleTabKeyDown}
                className="flex flex-wrap gap-1.5"
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
                      className={`inline-flex min-h-11 flex-none items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${selected ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
                    >
                      <Icon aria-hidden="true" size={17} />
                      {selected ? <span className="sr-only">Текущий раздел: </span> : null}
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-5">
            <div className="max-w-3xl">
              <OwnerPeriodSwitcher
                value={periodMode}
                period={period}
                busy={busy}
                onChange={onPeriodChange}
              />
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Сводка и детальные реестры используют один выбранный отчётный период.
          </p>
        </div>

        <div
          id={`owner-panel-${activeTab}`}
          role="tabpanel"
          aria-label={activeTabLabel}
          className="mt-6 scroll-mt-[144px] lg:scroll-mt-[100px]"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
