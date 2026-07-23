import type { Metadata } from 'next';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import WebDiscountPortal from './WebDiscountPortal';

export const metadata: Metadata = {
  title: 'Демо: оплата парковки гостей',
  description: 'Интерактивное demo РОСПАРК: поиск парковочной сессии и оплата парковки гостя за счёт арендатора.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function WebDiscountDemoPage() {
  return (
    <div className="pb-10">
      <Breadcrumbs items={[
        { label: 'Главная', href: '/' },
        { label: 'Демо ПО', href: '/demo' },
        { label: 'Оплата парковки гостей' },
      ]} />

      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-5 py-6 text-white sm:px-9 sm:py-10">
        <div className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
          Второй сценарий арендатора · Демо
        </div>
        <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.5rem]">
          Оплата парковки гостей
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:mt-5 sm:text-lg sm:leading-8">
          Парковка гостей за счёт арендатора: найдите посетителя по талону или номеру автомобиля и подтвердите оплату.
        </p>
      </section>

      <WebDiscountPortal />
    </div>
  );
}
