import type { Metadata } from 'next';
import Link from 'next/link';

import AnswerFirst from '@/app/components/content/AnswerFirst';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ExtendedInfo from '@/app/components/content/ExtendedInfo';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import RelatedCaseStudies from '@/app/components/content/RelatedCaseStudies';
import SolutionVisual from '@/app/components/content/SolutionVisual';
import LeadForm from '@/app/components/forms/LeadForm';
import { canonicalUrl } from '@/app/config/site-url';
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
  "alternates": {
    "canonical": canonicalUrl('/resheniya/torgovye-centry')
  },
  "openGraph": {
    "title": "Автоматизация парковки для торговых центров | РОСПАРК",
    "description": "Скорость проезда в часы пик, прозрачная выручка, удобство для покупателей. РОСПАРК объединяет въезд/выезд, тарифы и оплату в управляемую систему.",
    "url": canonicalUrl('/resheniya/torgovye-centry'),
    "type": "website"
  }
};

export default function TorgovyeCentresPage() {
  const heroTitle = "Автоматизация парковки для торговых центров | РОСПАРК";
  const heroDescription = "Управление въездом, оплатой и доступом на парковке торгового центра. РОСПАРК объединяет въезд, выезд, тарифы, оплату и отчётность в единую парковочную систему.";

  const extended = getExtendedContentBySlug('resheniya', 'torgovye-centry');
  const faq = extended?.faq ?? [];
  const answerFirst = extended?.answerFirst;

  const answerLead =
    answerFirst?.lead ??
    'Для торгового центра РОСПАРК — это быстрый проезд и прозрачный доход с парковки: меньше очередей, больше контроля, понятные правила для гостей и постоянных клиентов.';

  const answerBullets =
    answerFirst?.bullets?.length
      ? answerFirst.bullets
      : [
          'Сценарии «час пик»: ускорение потоков и снижение очередей.',
          'Прозрачная выручка: отчёты, события, аудит ручных вмешательств.',
          'Гибкие тарифы и льготы: правила без конфликтов с клиентами.',
          'Оплата через сайт и удобство для гостей при необходимости.',
        ];

  return (
    <div className="min-h-screen min-w-0 overflow-hidden bg-white">
      <FaqJsonLd items={faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Торговые центры', url: '/resheniya/torgovye-centry' },
        ]}
      />

      {/* HERO */}
      <section className="pt-32 pb-16 bg-slate-50 border-b">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <div className="max-w-3xl min-w-0">
            <h1 className="break-words text-3xl font-bold leading-tight text-slate-900 sm:text-4xl md:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-5 break-words text-lg text-slate-700">
              {heroDescription}
            </p>

            <div className="mt-8 flex min-w-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/quiz?source=request"
                className="inline-flex min-w-0 items-center justify-center rounded-xl bg-blue-600 px-6 py-4 text-center font-semibold leading-snug text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-8"
              >
                Рассчитать проект
              </Link>
              <Link
                href="/quiz?source=consult"
                className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-4 text-center font-semibold leading-snug text-slate-900 transition-colors hover:bg-slate-50 sm:px-8"
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

      <SolutionVisual
        src="/images/solutions/explainers/torgovye-centry.webp"
        alt="Инфографика РОСПАРК: автоматизация парковки торгового центра"
      />

      <AnswerFirst
        className="py-10"
        lead={answerLead}
        bullets={answerBullets}
      />

      <ExtendedInfo
        section="resheniya"
        slug="torgovye-centry"
        className="pb-8"
        summaryLabel="Расширенная информация: сценарии торгового центра, тарифы, онлайн-оплата, отказоустойчивость, FAQ"
      />

      <section className="py-12">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">Типовые задачи торгового центра</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="break-words text-lg font-semibold text-slate-900">Контроль выручки и снижение потерь</h3>
              <p className="mt-2 break-words text-slate-700">Прозрачные правила, журнал ручных вмешательств и управляемый доход с парковки.</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="break-words text-lg font-semibold text-slate-900">Снижение очередей в часы пик</h3>
              <p className="mt-2 break-words text-slate-700">Быстрый проезд постоянных клиентов и гостей, гибкая логика въезда/выезда.</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="break-words text-lg font-semibold text-slate-900">Комфорт для покупателей</h3>
              <p className="mt-2 break-words text-slate-700">Гостевые сценарии, оплата через сайт, понятные уведомления и поддержка персонала.</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">Для торгового центра критичны пики нагрузки: закладываем сценарии «час пик» и режимы деградации.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">Что входит в решение</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="break-words text-lg font-semibold text-slate-900">Въезд, выезд и идентификация</h3>
              <p className="mt-2 break-words text-slate-700">Номера автомобилей и/или идентификаторы, правила доступа по типам клиентов.</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="break-words text-lg font-semibold text-slate-900">Оплата и тарифы</h3>
              <p className="mt-2 break-words text-slate-700">Гибкая тарификация, льготы, исключения и оплата через сайт при необходимости.</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="break-words text-lg font-semibold text-slate-900">Отчёты и аналитика</h3>
              <p className="mt-2 break-words text-slate-700">Выручка, загрузка, инциденты, эффективность льгот и правил.</p>
            </div>

          </div>
        </div>
      </section>

      <RelatedCaseStudies
        description="Примеры объектов, где РОСПАРК решает задачи высокого трафика, оплаты, льгот и разделения потоков посетителей."
        items={[
          {
            title: 'Фудмолл «Депо. Три вокзала»',
            description:
              'Управление высоким трафиком и снижение очередей в часы пик.',
            href: '/keysy/depo3vokzala',
            coverImage: '/images/cases/depo3vokzala-cover.jpg',
            category: 'Торговый центр',
          },
          {
            title: 'ТЦ «Горизонт», Ростов',
            description:
              'Управление трафиком, интеграция скидок от арендаторов и снижение заторов.',
            href: '/keysy/gorizont-rostov',
            coverImage: '/images/cases/gorisont-rostov-cover.jpg',
            category: 'Торговый центр',
          },
          {
            title: 'Супермаркет «EUROSPAR», Чертановская',
            description:
              'Интеграция с приложением, въезд по QR-коду и оплата картой на выезде.',
            href: '/keysy/spar-chertanovskaya',
            coverImage: '/images/cases/spar-chertanovskaya-cover.jpg',
            category: 'Торговый центр',
          },
        ]}
      />

      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <div className="rounded-2xl bg-blue-700/30 p-6 sm:p-8 md:p-10">
            <h2 className="break-words text-2xl font-bold leading-tight md:text-3xl">Рассчитайте проект для торгового центра</h2>
            <p className="mt-4 text-blue-100 max-w-3xl">
              Подскажем оптимальную схему для ваших въездов и выездов, рассчитаем бюджет и окупаемость, дадим план внедрения.
            </p>
            <div className="mt-8 flex min-w-0 flex-col gap-3 sm:flex-row">
              <Link href="/quiz" className="inline-flex min-w-0 items-center justify-center rounded-xl bg-white px-6 py-4 text-center font-semibold leading-snug text-blue-700 shadow-sm transition-colors hover:bg-blue-50 sm:px-8">
                Рассчитать проект
              </Link>
              <Link href="/quiz?source=consult" className="inline-flex min-w-0 items-center justify-center rounded-xl border border-white/40 bg-transparent px-6 py-4 text-center font-semibold leading-snug text-white transition-colors hover:bg-white/10 sm:px-8">
                Получить консультацию
              </Link>
            </div>
          </div>

          <div id="lead" className="mx-auto mt-10 w-full max-w-4xl rounded-2xl bg-white p-5 sm:p-6 md:p-8">
            <LeadForm
              sourceSection="lead_cta"
              sourcePage="/resheniya/torgovye-centry"
              submitLabel="Рассчитать проект"
            />
          </div>
        </div>
      </section>

      {/* Навигация */}
      <section className="pb-16">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <Link href="/" className="text-blue-600 font-medium hover:underline">
            ← На главную страницу РОСПАРК
          </Link>
        </div>
      </section>
    </div>
  );
}
