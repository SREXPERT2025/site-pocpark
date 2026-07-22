import Link from 'next/link';
import { BadgePercent, ClipboardList, LineChart } from 'lucide-react';

type DemoScenarioNavProps = {
  active: 'guest-requests' | 'web-discounts' | 'owner';
};

const baseClass = 'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition';

export default function DemoScenarioNav({ active }: DemoScenarioNavProps) {
  return (
    <nav aria-label="Сценарии demo-системы" className="overflow-x-auto border-t border-white/10 px-4 py-3 sm:px-7">
      <div className="flex min-w-max gap-2">
        <Link
          href="/demo/gostevaya-zayavka"
          aria-current={active === 'guest-requests' ? 'page' : undefined}
          className={`${baseClass} ${active === 'guest-requests' ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}
        >
          <ClipboardList aria-hidden="true" size={17} />
          Гостевые заявки
        </Link>
        <Link
          href="/demo/web-skidki"
          aria-current={active === 'web-discounts' ? 'page' : undefined}
          className={`${baseClass} ${active === 'web-discounts' ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}
        >
          <BadgePercent aria-hidden="true" size={17} />
          Оплата парковки гостей
        </Link>
        <span
          aria-disabled="true"
          title="Следующий раздел · другая роль"
          className={`${baseClass} cursor-not-allowed text-slate-500`}
        >
          <LineChart aria-hidden="true" size={17} />
          Кабинет владельца
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">Другая роль</span>
        </span>
      </div>
    </nav>
  );
}
