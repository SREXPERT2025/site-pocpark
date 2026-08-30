import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  House,
  KeyRound,
  LifeBuoy,
  PackageCheck,
  ShoppingBag,
  Warehouse,
} from 'lucide-react';

import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import CompactInfographic from '@/app/components/content/CompactInfographic';
import { canonicalUrl } from '@/app/config/site-url';

const title = 'О компании';
const description =
  'РОСПАРК — парковочные системы для коммерческих и жилых объектов. Юридическая информация, офис продаж, контакты и направления работы.';

const quickLinks = [
  { href: '/keysy', label: 'Кейсы' },
  { href: '/oborudovanie', label: 'Оборудование' },
  { href: '/resheniya/dlya-rukovoditeley', label: 'Решения' },
  { href: '/contacts', label: 'Контакты' },
];

const objectTypes = [
  {
    title: 'Торговые центры',
    href: '/resheniya/torgovye-centry',
    icon: ShoppingBag,
  },
  {
    title: 'Бизнес-центры',
    href: '/resheniya/biznes-centry',
    icon: Building2,
  },
  {
    title: 'Складские комплексы',
    href: '/resheniya/skladskie-kompleksy',
    icon: Warehouse,
  },
  {
    title: 'Жилые комплексы и объекты застройщиков',
    href: '/resheniya/zastroyschiki',
    icon: House,
  },
  {
    title: 'Гостевой, арендный и постоянный доступ',
    href: '/vozmozhnosti',
    icon: KeyRound,
    wide: true,
  },
] as const;

const companyProcess = [
  { title: 'Обследование объекта', icon: ClipboardCheck },
  { title: 'Комплектация системы', icon: PackageCheck },
  { title: 'Запуск и сопровождение', icon: LifeBuoy },
] as const;

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: canonicalUrl('/o-kompanii'),
  },
  openGraph: {
    title,
    description,
    url: canonicalUrl('/o-kompanii'),
    type: 'website',
  },
};

export default function CompanyPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'О компании', url: '/o-kompanii' },
        ]}
      />

      <section className="border-b bg-slate-50 pb-12 pt-28 sm:pb-16 sm:pt-32">
        <div className="container mx-auto max-w-5xl px-4">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            О компании
          </p>
          <h1 className="max-w-4xl text-[34px] font-bold leading-[1.12] text-slate-950 sm:text-5xl">
            РОСПАРК — парковочные системы для объектов с управляемым доступом
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
            РОСПАРК помогает организовать въезд, выезд, оплату и администрирование парковки на объектах, где важны понятные правила доступа и контроль событий.
          </p>
        </div>
      </section>

      <section className="bg-white py-6 sm:py-8">
        <div className="container mx-auto max-w-5xl px-4">
          <CompactInfographic
            id="company-process"
            title="От задачи до работающей парковки"
            items={companyProcess}
          />
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Кто такой РОСПАРК</h2>
            <p className="mt-4 leading-relaxed text-slate-700">
              РОСПАРК — бренд парковочных систем. Юридическое лицо, указанное в публичных и юридических разделах сайта, — ООО «СР Эксперт».
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Что делает компания</h2>
            <p className="mt-4 leading-relaxed text-slate-700">
              Компания занимается решениями для автоматизации парковок: оборудованием, сценариями доступа, оплатой, администрированием и сопровождением внедрения.
            </p>
          </article>
        </div>
      </section>

      <section className="border-y bg-slate-50 py-12 sm:py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
            Для каких объектов внедряются парковочные системы
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {objectTypes.map(({ title, href, icon: Icon, ...item }) => (
              <li key={href} className={'min-w-0 ' + ('wide' in item ? 'sm:col-span-2' : '')}>
                <Link
                  href={href}
                  className="group flex min-h-24 items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
                    <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <span className="flex-1 text-lg font-semibold leading-snug">{title}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-blue-700 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold text-slate-950 sm:text-3xl">Адреса</h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">Юридическая информация</h3>
              <dl className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                <div>
                  <dt className="font-semibold text-slate-950">Юридическое лицо</dt>
                  <dd>Общество с ограниченной ответственностью «СР Эксперт»</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-950">Краткое наименование</dt>
                  <dd>ООО «СР Эксперт»</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-950">ИНН</dt>
                  <dd>5040100635</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-950">ОГРН</dt>
                  <dd>1105040005124</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">Офис продаж</h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                123298, Россия, г. Москва, ул. Народного ополчения, д.38к3, офис 117
              </p>
              <a
                href="https://yandex.ru/maps/-/CTqWnIkl"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              >
                Открыть в Яндекс Картах
              </a>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-950">Юридический адрес</h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                140108, Московская область, г. Раменское, ул. Михалевича, д. 51А, комната 61
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Используется для юридических документов и официальной корреспонденции.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y bg-slate-50 py-12 sm:py-16">
        <div className="container mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-[1fr_1.2fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Контакты</h2>
            <ul className="mt-5 space-y-4 text-slate-700">
              <li>
                <span className="font-semibold text-slate-950">Телефон: </span>
                <a href="tel:+74993212040" className="text-blue-700 hover:underline">
                  +7 (499) 321-20-40
                </a>
              </li>
              <li>
                <span className="font-semibold text-slate-950">Публичная почта: </span>
                <a href="mailto:is@srexpert.su" className="text-blue-700 hover:underline">
                  is@srexpert.su
                </a>
              </li>
              <li>
                <span className="font-semibold text-slate-950">Юридические вопросы и персональные данные: </span>
                <a href="mailto:rav@srexpert.su" className="text-blue-700 hover:underline">
                  rav@srexpert.su
                </a>
              </li>
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Разделы сайта</h2>
            <p className="mt-4 leading-relaxed text-slate-700">
              Для знакомства с проектами, оборудованием и сценариями внедрения используйте основные разделы сайта.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-900 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="rounded-2xl bg-blue-600 p-6 text-white sm:p-8">
            <h2 className="text-2xl font-semibold">Обсудить парковочную систему для объекта</h2>
            <p className="mt-3 max-w-3xl text-blue-50">
              Опишите объект и задачу — команда РОСПАРК подскажет, какие сценарии автоматизации парковки стоит рассмотреть.
            </p>
            <Link
              href="/contacts"
              className="mt-6 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
            >
              Перейти в контакты
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
