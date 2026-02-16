import type { Metadata } from 'next';
import Link from 'next/link';

import AnswerFirst from '@/app/components/content/AnswerFirst';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ExtendedInfo from '@/app/components/content/ExtendedInfo';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import LeadForm from '@/app/components/forms/LeadForm';
import { getExtendedContentBySlug } from '@/lib/content-parser';

export const metadata: Metadata = {
  "title": "Автоматизация парковки для застройщиков и ЖК | РОСПАРК",
  "description": "Разделение потоков резидентов, гостей и подрядчиков, контроль доступа и событий, минимум ручных конфликтов. Внедрение поэтапно и без перегруза интерфейса.",
  "keywords": [
    "автоматизация парковки",
    "парковочная система",
    "шлагбаум",
    "распознавание номеров",
    "онлайн-оплата парковки",
    "РОСПАРК"
  ],
  "openGraph": {
    "title": "Автоматизация парковки для застройщиков и ЖК | РОСПАРК",
    "description": "Разделение потоков резидентов, гостей и подрядчиков, контроль доступа и событий, минимум ручных конфликтов. Внедрение поэтапно и без перегруза интерфейса.",
    "type": "website"
  }
};

export default function ZastroyschikiPage() {
  const heroTitle = "Автоматизация парковки для застройщиков и ЖК | РОСПАРК";
  const heroDescription = "Разделение потоков резидентов, гостей и подрядчиков, контроль доступа и событий, минимум ручных конфликтов. Внедрение поэтапно и без перегруза интерфейса.";

  const extended = getExtendedContentBySlug('resheniya', 'zastroyschiki');
  const faq = extended?.faq ?? [];
  const answerFirst = extended?.answerFirst;

  const answerLead =
    answerFirst?.lead ??
    'Для ЖК РОСПАРК — это стабильные правила доступа по типам клиентов: меньше конфликтов, прозрачный контроль и понятная эксплуатация для УК.';

  const answerBullets =
    answerFirst?.bullets?.length
      ? answerFirst.bullets
      : [
          'Разделение типов клиентов: резиденты, арендаторы, гости, подрядчики.',
          'Гостевые заявки и подтверждения по регламенту УК.',
          'Антифрод и аудит: стоп-листы, исключения, действия пользователей.',
          'Отказоустойчивость и регламенты — критично для жилых объектов.',
        ];

  return (
    <main className="min-h-screen bg-white">
      <FaqJsonLd items={faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Застройщики и ЖК', url: '/resheniya/zastroyschiki' },
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
                href="/quiz?source=consult"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Получить консультацию
              </Link>
              <Link
                href="/quiz?source=price"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
              >
                Рассчитать стоимость
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
        slug="zastroyschiki"
        className="pb-8"
        summaryLabel="Расширенная информация: сценарии ЖК, гостевые заявки, безопасность, эксплуатация, FAQ"
      />

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Типовые задачи застройщика/ЖК</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Разделение потоков</h3>
              <p className="mt-2 text-slate-700">Резиденты, арендаторы, гости, подрядчики — разные правила и уровни доступа.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Контроль гостевых пропусков</h3>
              <p className="mt-2 text-slate-700">Заявки, подтверждения, ограничение времени и количества въездов.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Безопасность и порядок</h3>
              <p className="mt-2 text-slate-700">Стоп-листы, 2FA-сценарии, аудит действий и исключений.</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">В ЖК важны стабильность и понятные правила для жителей: минимум ручных операций и спорных ситуаций.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Что входит в решение</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Типы клиентов</h3>
              <p className="mt-2 text-slate-700">Постоянные/арендные/гостевые/разовые сценарии по регламенту.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Эксплуатация</h3>
              <p className="mt-2 text-slate-700">Журналы событий, поддержка, регламент инцидентов.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Масштабирование</h3>
              <p className="mt-2 text-slate-700">Добавление въездов/выездов и функций без перестроек (итеративно).</p>
            </div>

          </div>
        </div>
      </section>

      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="rounded-2xl bg-blue-700/30 p-10">
            <h2 className="text-3xl md:text-4xl font-bold">Консультация по ЖК</h2>
            <p className="mt-4 text-blue-100 max-w-3xl">
              Разберём ситуацию, предложим 2–3 архитектуры доступа по типам клиентов и план внедрения без перегруза текста.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/contacts" className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 font-semibold text-blue-700 shadow-sm hover:bg-blue-50 transition-colors">
                Получить консультацию
              </Link>
              <Link href="/quiz" className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-transparent px-8 py-4 font-semibold text-white hover:bg-white/10 transition-colors">
                Рассчитать стоимость
              </Link>
            </div>
          </div>

	          {/* Лид-форма (внизу страницы, чтобы не мешала чтению) */}
	          <div id="lead" className="mt-10 rounded-2xl bg-white p-6 md:p-8">
	            <LeadForm
	              sourceSection="lead_cta"
	              sourcePage="/resheniya/zastroyschiki"
	              submitLabel="Получить консультацию"
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
