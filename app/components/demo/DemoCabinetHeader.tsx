'use client';

import { Building2, LogOut } from 'lucide-react';
import DemoScenarioNav from './DemoScenarioNav';

type DemoCabinetHeaderProps = {
  active: 'guest-requests' | 'web-discounts' | 'owner';
  objectName: string;
  role: string;
  onLogout: () => void;
};

export default function DemoCabinetHeader({ active, objectName, role, onLogout }: DemoCabinetHeaderProps) {
  return (
    <header className="bg-slate-950 text-white">
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 rounded-xl bg-blue-600 p-2.5"><Building2 aria-hidden="true" size={22} /></span>
          <div className="min-w-0">
            <p className="truncate font-bold">{objectName}</p>
            <p className="text-xs text-slate-400">{role} · TEST · Демо</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:self-auto"
        >
          <LogOut aria-hidden="true" size={17} />
          Выйти
        </button>
      </div>
      <DemoScenarioNav active={active} />
    </header>
  );
}
