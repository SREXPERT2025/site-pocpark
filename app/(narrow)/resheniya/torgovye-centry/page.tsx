import type { Metadata } from 'next';
import Link from 'next/link';

import AnswerFirst from '@/app/components/content/AnswerFirst';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ExtendedInfo from '@/app/components/content/ExtendedInfo';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import LeadForm from '@/app/components/forms/LeadForm';
import { getExtendedContentBySlug } from '@/lib/content-parser';

export const metadata: Metadata = {
  "title": "Автоматизация парковки для торговых центров | РОСПАРК",
  "description": "Скорость проезда в часы пик, прозрачная выручка, удобство для покупателей. РОСПАРК объединяет въезд/выезд, тарифы и оплату в управляемую систему.",
  "keywords": [
    "автоматизация парковки",
    "парковочная система",
    "шлагбаум",
    "распознавание номеров",
    "онлайн-оплата парковки",
    "РОСПАРК"
  ],
  "openGraph": {
    "title": "Автоматизация парковки для торговых центров | РОСПАРК",
    "description": "Скорость проезда в часы пик, прозрачная выручка, удобство для покупателей. РОСПАРК объединяет въезд/выезд, тарифы и оплату в управляемую систему.",
    "type": "website"
  }
};

export default function TorgovyeCentresPage() {
  const heroTitle = "Автоматизация парковки для торговых центров | РОСПАРК";
  const heroDescription = "Скорость проезда в часы пик, прозрачная выручка, удобство для покупателей. РОСПАРК объединяет въезд/выезд, тарифы и оплату в управляемую систему.";

  const extended = getExtendedContentBySlug('resheniya', 'torgovye-centry');
  const faq = extended?.faq ?? [];
  const answerFirst = extended?.answerFirst;

  const answerLead =
    answerFirst?.lead ??
    'Для ТЦ РОСПАРК — это быстрый проезд и прозрачная монетизация: меньше очередей, больше контроля, понятные правила для гостей и постоянных клиентов.';

  const answerBullets =
    answerFirst?.bullets?.length
      ? answerFirst.bullets
      : [
          'Сценарии «час пик»: ускорение потоков и снижение очередей.',
          'Прозрачная выручка: отчёты, события, аудит ручных вмешательств.',
          'Гибкие тарифы и льготы: правила без конфликтов с клиентами.',
          'Онлайн-оплата и удобство для гостей (по необходимости).',
        ];

  return (
    <main className="min-h-screen bg-white">
      <FaqJsonLd items={faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Торговые центры', url: '/resheniya/torgovye-centry' },
        ]}
      />

      {/* HERO */}
      <section className="pt-32 pb-16 bg-slate-50 border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-slate-900">
              {heroTitle}
            </h1>
            <p className="mt-5 text-lg text-slate-700">
              {heroDescription}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/quiz?source=request"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Запросить расчёт
              </Link>
              <Link
                href="/quiz?source=consult"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
              >
                Получить консультацию
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Ответим в рабочее время и предложим 2–3 схемы внедрения под ваш объект.
            </p>
          </div>
        </div>
      </section>

      <AnswerFirst
        className="py-10"
        lead={answerLead}
        bullets={answerBullets}
      />

      <ExtendedInfo
        section="resheniya"
        slug="torgovye-centry"
        className="pb-8"
        summaryLabel="Расширенная информация: сценарии ТЦ, тарифы, онлайн-оплата, отказоустойчивость, FAQ"
      />

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Типовые задачи торгового центра</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Рост выручки и контроль потерь</h3>
              <p className="mt-2 text-slate-700">Прозрачные правила, аудит ручных вмешательств и управляемая монетизация парковки.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Скорость и отсутствие очередей</h3>
              <p className="mt-2 text-slate-700">Быстрый проезд постоянных клиентов и гостей, гибкая логика въезда/выезда.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Комфорт для покупателей</h3>
              <p className="mt-2 text-slate-700">Гостевые сценарии, онлайн-оплата, понятные уведомления и поддержка персонала.</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">Для ТЦ критичны пики нагрузки: закладываем сценарии «час пик» и режимы деградации.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Что входит в решение</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Въезд/выезд и идентификация</h3>
              <p className="mt-2 text-slate-700">Номера (ANPR) и/или идентификаторы, правила доступа по типам клиентов.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Оплата и тарифы</h3>
              <p className="mt-2 text-slate-700">Гибкая тарификация, льготы, исключения, онлайн-оплата при необходимости.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Отчёты и аналитика</h3>
              <p className="mt-2 text-slate-700">Выручка, загрузка, инциденты, эффективность льгот и правил.</p>
            </div>

          </div>
        </div>
      </section>

      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="rounded-2xl bg-blue-700/30 p-10">
            <h2 className="text-3xl md:text-4xl font-bold">Запросите расчёт для ТЦ</h2>
            <p className="mt-4 text-blue-100 max-w-3xl">
              Подскажем оптимальную схему для ваших въездов/выездов, рассчитаем бюджет и окупаемость, дадим план внедрения.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/quiz" className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 font-semibold text-blue-700 shadow-sm hover:bg-blue-50 transition-colors">
                Запросить расчёт
              </Link>
              <Link href="/contacts" className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-transparent px-8 py-4 font-semibold text-white hover:bg-white/10 transition-colors">
                Получить консультацию
              </Link>
            </div>
          </div>

          <div className="mt-8 max-w-2xl">
            <LeadForm
              sourceSection="lead_cta"
              sourcePage="/resheniya/torgovye-centry"
              submitLabel="Запросить расчёт"
            />
          </div>
        </div>
      </section>

      {/* Навигация */}
      <section className="pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <Link href="/resheniya" className="text-blue-600 font-medium hover:underline">
            ← Все решения РОСПАРК
          </Link>
        </div>
      </section>
    </main>
  );
}
