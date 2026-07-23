import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  LineChart,
  Route,
  ShieldCheck,
} from 'lucide-react';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import { canonicalUrl } from '@/app/config/site-url';

const pagePath = '/demo';

export const metadata: Metadata = {
  title: 'Демо программного обеспечения для парковки',
  description:
    'Три связанных demo-сценария РОСПАРК: гостевые заявки, оплата парковки посетителя за счёт арендатора и отчётность владельца парковки.',
  alternates: { canonical: canonicalUrl(pagePath) },
  openGraph: {
    title: 'Демо программного обеспечения РОСПАРК',
    description:
      'Создайте гостевую заявку, оплатите парковку посетителя и изучите отчётность владельца парковки.',
    url: canonicalUrl(pagePath),
    type: 'website',
  },
};

const scenarios = [
  {
    title: 'Гостевые заявки',
    description:
      'Арендатор заранее создаёт пропуск, отправляет гостю ссылку и QR-код, а затем видит въезд, выезд, продолжительность и начисление.',
    audiences: [
      'Бизнес-центры',
      'Офисные комплексы',
      'Жилые комплексы',
      'Объекты с предварительным согласованием гостей',
    ],
    cta: 'Открыть демо заявок',
    href: '/demo/gostevaya-zayavka',
    icon: ClipboardList,
    accent: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    title: 'Оплата парковки гостей',
    description:
      'Арендатор находит уже въехавшего посетителя по талону или автомобилю и оплачивает парковку за свой счёт.',
    audiences: [
      'Склады',
      'Логистические комплексы',
      'Торговые центры',
      'Сервисные и развлекательные объекты',
    ],
    cta: 'Открыть демо оплаты',
    href: '/demo/web-skidki',
    icon: BadgePercent,
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Кабинет владельца парковки',
    description:
      'Владелец контролирует гостевые операции, начисления, арендаторов, легковой и грузовой транспорт и получает подробную отчётность.',
    audiences: [
      'Сводка по парковке',
      'Расчёты по арендаторам',
      'Реестры заявок и оплат',
      'Исторические и текущие данные',
    ],
    cta: 'Открыть кабинет владельца',
    href: '/demo/vladelec-parkovki',
    icon: LineChart,
    accent: 'border-violet-200 bg-violet-50 text-violet-700',
  },
] as const;

export default function DemoSoftwarePage() {
  return (
    <div className="pb-14">
      <BreadcrumbJsonLd items={[{ name: 'Главная', url: '/' }, { name: 'Демо ПО', url: pagePath }]} />
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Демо ПО' }]} />

      <section className="overflow-hidden rounded-[32px] bg-slate-950 px-5 py-9 text-white sm:px-9 sm:py-14 lg:px-14 lg:py-16">
        <div className="grid gap-9 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300 sm:text-sm">
              Демо программного обеспечения
            </p>
            <h1 className="mt-4 max-w-4xl text-[clamp(2rem,6vw,4rem)] font-bold leading-[1.05] tracking-tight">
              Посмотрите, как работает программное обеспечение РОСПАРК
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
              Создайте гостевую заявку, оплатите парковку посетителя за счёт арендатора и изучите отчётность владельца парковки.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <ShieldCheck aria-hidden="true" size={25} className="text-blue-300" />
            <p className="mt-3 text-sm font-semibold leading-6 text-white">
              Все организации, автомобили, суммы и события в демонстрации являются вымышленными.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Демо не управляет реальным шлагбаумом и не выполняет реальные списания.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="demo-scenarios-title" className="mt-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Три роли одной системы</p>
          <h2 id="demo-scenarios-title" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Выберите сценарий
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Начните с любой карточки или последовательно пройдите путь арендатора и владельца парковки.
          </p>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {scenarios.map((scenario, index) => {
            const Icon = scenario.icon;
            return (
              <article key={scenario.href} className="flex min-w-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <span className={`inline-flex rounded-2xl border p-3 ${scenario.accent}`}>
                    <Icon aria-hidden="true" size={26} />
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-2xl font-bold leading-tight text-slate-950">{scenario.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{scenario.description}</p>
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Подходит для</p>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                    {scenario.audiences.map((audience) => (
                      <li key={audience} className="flex items-start gap-2">
                        <CheckCircle2 aria-hidden="true" size={17} className="mt-1 shrink-0 text-blue-600" />
                        <span>{audience}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={scenario.href}
                  className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  {scenario.cta}
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
          <div className="inline-flex rounded-2xl bg-blue-700 p-3 text-white">
            <KeyRound aria-hidden="true" size={24} />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.15em] text-blue-700">Единый demo-вход</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">TEST / TEST</h2>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Логин</dt>
              <dd className="mt-1 font-mono text-lg font-bold text-slate-950">TEST</dd>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Пароль</dt>
              <dd className="mt-1 font-mono text-lg font-bold text-slate-950">TEST</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-6 text-blue-950">
            Один demo-вход используется во всех трёх сценариях.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
            <Route aria-hidden="true" size={24} />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.15em] text-blue-700">Связанный пользовательский путь</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Пройдите демонстрацию по шагам</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              'Создайте гостевую заявку.',
              'Оплатите парковку посетителя.',
              'Откройте кабинет владельца и посмотрите результат.',
            ].map((step, index) => (
              <li key={step} className="rounded-2xl border border-slate-200 bg-white p-4">
                <span className="font-mono text-xs font-bold text-blue-700">ШАГ {index + 1}</span>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
