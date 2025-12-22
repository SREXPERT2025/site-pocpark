import type { Metadata } from 'next';
import Link from 'next/link';

import AnswerFirst from '@/app/components/content/AnswerFirst';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ExtendedInfo from '@/app/components/content/ExtendedInfo';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import LeadForm from '@/app/components/forms/LeadForm';
import { getExtendedContentBySlug } from '@/lib/content-parser';

export const metadata: Metadata = {
  "title": "Автоматизация парковки для бизнес-центров | РОСПАРК",
  "description": "Доступ для арендаторов и гостей, правила по организациям, журналы событий и контроль исключений. РОСПАРК помогает держать порядок без ручного хаоса.",
  "keywords": [
    "автоматизация парковки",
    "парковочная система",
    "шлагбаум",
    "распознавание номеров",
    "онлайн-оплата парковки",
    "РОСПАРК"
  ],
  "openGraph": {
    "title": "Автоматизация парковки для бизнес-центров | РОСПАРК",
    "description": "Доступ для арендаторов и гостей, правила по организациям, журналы событий и контроль исключений. РОСПАРК помогает держать порядок без ручного хаоса.",
    "type": "website"
  }
};

export default function BiznesCentresPage() {
  const heroTitle = "Автоматизация парковки для бизнес-центров | РОСПАРК";
  const heroDescription = "Доступ для арендаторов и гостей, правила по организациям, журналы событий и контроль исключений. РОСПАРК помогает держать порядок без ручного хаоса.";

  const extended = getExtendedContentBySlug('resheniya', 'biznes-centry');
  const faq = extended?.faq ?? [];
  const answerFirst = extended?.answerFirst;

  const answerLead =
    answerFirst?.lead ??
    'Для БЦ РОСПАРК — это дисциплина доступа: роли и политики, гостевые заявки, отчёты по организациям и прозрачный аудит действий.';

  const answerBullets =
    answerFirst?.bullets?.length
      ? answerFirst.bullets
      : [
          'Контроль арендаторов: правила по организациям и лимиты мест.',
          'Гостевые сценарии: заявки, подтверждения, прозрачные исключения.',
          'Журналы событий и аудит: кто, что и когда сделал.',
          'Интеграции при необходимости: СКУД и корпоративные реестры.',
        ];

  return (
    <main className="min-h-screen bg-white">
      <FaqJsonLd items={faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Бизнес-центры', url: '/resheniya/biznes-centry' },
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
                href="/quiz"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Запросить расчёт
              </Link>
              <Link
                href="/contacts"
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
        slug="biznes-centry"
        className="pb-8"
        summaryLabel="Расширенная информация: политики доступа, гостевые заявки, интеграции, аудит, FAQ"
      />

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Типовые задачи бизнес-центра</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Абонементы и арендаторы</h3>
              <p className="mt-2 text-slate-700">Контроль доступа по организациям и правилам, лимиты мест, исключения по ролям.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Гостевая парковка</h3>
              <p className="mt-2 text-slate-700">Заявки для гостей, временные пропуска, прозрачные подтверждения и аудит.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Интеграции</h3>
              <p className="mt-2 text-slate-700">При необходимости — связка со СКУД и корпоративными реестрами.</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">В БЦ важна дисциплина доступа: политики, роли и аудит действий.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Что входит в решение</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Контур доступа</h3>
              <p className="mt-2 text-slate-700">Типы клиентов, правила проезда, стоп-листы и исключения.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Администрирование</h3>
              <p className="mt-2 text-slate-700">Роли и права, журналы событий, отчёты по организациям.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Сервис и эксплуатация</h3>
              <p className="mt-2 text-slate-700">Отказоустойчивость, диагностика, регламент действий.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="rounded-2xl bg-blue-700/30 p-10">
            <h2 className="text-3xl md:text-4xl font-bold">Запросите расчёт для бизнес-центра</h2>
            <p className="mt-4 text-blue-100 max-w-3xl">
              Подберём модель доступа для арендаторов и гостей, согласуем роли и регламенты, оценим бюджет внедрения.
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

	          {/* Лид-форма (внизу страницы, якорь для кнопок "Запросить расчёт") */}
	          <div id="lead" className="mt-10 rounded-2xl bg-white p-6 md:p-8">
	            <LeadForm
	              sourceSection="lead_bottom"
	              sourcePage="/resheniya/biznes-centry"
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
