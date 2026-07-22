import type { Metadata } from 'next';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import OwnerParkingPortal from './OwnerParkingPortal';

export const metadata: Metadata = {
  title: 'Демо кабинета владельца парковки',
  description:
    'Интерактивное demo РОСПАРК: контроль гостевых проездов, начислений и расчётов с арендаторами.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function OwnerParkingDemoPage() {
  return (
    <div className="pb-10">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Возможности', href: '/vozmozhnosti' },
          { label: 'Демо кабинета владельца' },
        ]}
      />

      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-5 py-7 text-white sm:px-9 sm:py-11">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200 sm:text-sm">
          Демо для владельца парковки
        </p>
        <h1 className="mt-4 max-w-5xl text-[clamp(2rem,6vw,3.5rem)] font-bold leading-[1.06] tracking-tight">
          Контроль парковки и расчётов с арендаторами
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200 sm:mt-5 sm:text-lg sm:leading-8">
          Смотрите гостевые проезды, оплату парковки, начисления и детализацию по каждому арендатору в едином кабинете.
        </p>
      </section>

      <OwnerParkingPortal />
    </div>
  );
}
