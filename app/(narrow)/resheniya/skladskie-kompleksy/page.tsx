import type { Metadata } from 'next';
import Link from 'next/link';

import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import SolutionVisual from '@/app/components/content/SolutionVisual';
import LeadForm from '@/app/components/forms/LeadForm';
import { canonicalUrl } from '@/app/config/site-url';

const heroTitle = 'Автоматизация парковки и проездов для складских комплексов | РОСПАРК';
const heroDescription =
  'РОСПАРК помогает управлять въездом, выездом, КПП, пропусками и доступом транспорта на складских и логистических объектах.';

const problems = [
  {
    title: 'Очереди на въезде и выезде',
    text: 'Грузовой транспорт, сотрудники, подрядчики и гости проходят через одни КПП, а ручная проверка быстро создаёт заторы.',
  },
  {
    title: 'Разные правила доступа',
    text: 'Служебный транспорт, подрядчики, грузовые автомобили и гостевые машины требуют разных сценариев допуска.',
  },
  {
    title: 'Недостаток прозрачности',
    text: 'Когда решения принимаются вручную, сложнее восстановить событие, понять основание проезда и разобрать спорную ситуацию.',
  },
];

const managedItems = [
  'въезд и выезд через КПП;',
  'шлагбаумы и стойки проезда;',
  'распознавание номеров;',
  'временные и постоянные доступы;',
  'журнал событий и действий операторов;',
  'отчётность по проездам, пользователям и правилам.',
];

const scenarios = [
  'служебный транспорт сотрудников;',
  'подрядчики и временные пропуска;',
  'грузовые автомобили и поставщики;',
  'гостевые автомобили;',
  'технические зоны и внутренние проезды;',
  'несколько въездных групп с разными правилами.',
];

const components = [
  {
    title: 'Шлагбаумы и стойки проезда',
    text: 'Въездные и выездные точки настраиваются под габариты, трафик и регламент объекта.',
  },
  {
    title: 'Камеры распознавания номеров',
    text: 'Номер автомобиля используется как один из идентификаторов для допуска и журнала событий.',
  },
  {
    title: 'Контроллеры, светофоры и табло',
    text: 'Оборудование помогает управлять логикой проезда, очередностью и подсказками для водителей.',
  },
];

const integrationItems = [
  'СКУД и внутренние контуры доступа;',
  'заявки на временный или гостевой проезд;',
  'правила доступа по категориям транспорта;',
  'внутренние регламенты службы безопасности и эксплуатации.',
];

const internalLinks = [
  { href: '/oborudovanie', label: 'Оборудование' },
  { href: '/vozmozhnosti/raspoznavanie-nomerov', label: 'Распознавание номеров' },
  { href: '/resheniya/dlya-inzhenerov', label: 'Для инженеров' },
  { href: '/resheniya/dlya-sluzhby-bezopasnosti', label: 'Для службы безопасности' },
  { href: '/contacts', label: 'Контакты' },
  { href: '/quiz', label: 'Квиз для расчёта' },
];

const faq = [
  {
    question: 'Можно ли разделить правила для сотрудников, подрядчиков и грузового транспорта?',
    answer:
      'Да. Для разных категорий можно настроить отдельные правила доступа, временные ограничения, списки и основания для проезда.',
  },
  {
    question: 'Подходит ли решение для нескольких КПП?',
    answer:
      'Да. Сценарии можно проектировать для нескольких въездных групп, внутренних зон и разных типов транспорта.',
  },
  {
    question: 'Можно ли связать проезды с заявками и регламентами объекта?',
    answer:
      'Да. Сценарии доступа могут учитывать заявки, роли пользователей и внутренние правила эксплуатации или службы безопасности.',
  },
];

export const metadata: Metadata = {
  title: heroTitle,
  description: heroDescription,
  keywords: [
    'автоматизация парковки склад',
    'парковочная система складской комплекс',
    'КПП складской комплекс',
    'контроль проезда грузового транспорта',
    'распознавание номеров склад',
    'РОСПАРК',
  ],
  alternates: {
    canonical: canonicalUrl('/resheniya/skladskie-kompleksy'),
  },
  openGraph: {
    title: heroTitle,
    description: heroDescription,
    url: canonicalUrl('/resheniya/skladskie-kompleksy'),
    type: 'website',
  },
};

export default function WarehouseSolutionsPage() {
  return (
    <main className="min-h-screen min-w-0 overflow-hidden bg-white">
      <FaqJsonLd items={faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Складские комплексы', url: '/resheniya/skladskie-kompleksy' },
        ]}
      />

      <section className="border-b bg-slate-50 pb-16 pt-32">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <div className="max-w-3xl min-w-0">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Складские и логистические комплексы
            </p>
            <h1 className="break-words text-3xl font-bold leading-tight text-slate-900 sm:text-4xl md:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-5 break-words text-lg leading-relaxed text-slate-700">
              Автоматизируйте проезды, КПП и пропускные сценарии для складов, логистических комплексов, технических зон и объектов с грузовым трафиком.
            </p>
            <div className="mt-8 flex min-w-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/quiz?source=warehouse"
                className="inline-flex min-w-0 items-center justify-center rounded-xl bg-blue-600 px-6 py-4 text-center font-semibold leading-snug text-white shadow-sm transition-colors hover:bg-blue-700 sm:px-8"
              >
                Рассчитать конфигурацию
              </Link>
              <Link
                href="/contacts"
                className="inline-flex min-w-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-4 text-center font-semibold leading-snug text-slate-900 transition-colors hover:bg-slate-50 sm:px-8"
              >
                Связаться
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Опишите КПП, типы транспорта и правила доступа — подберём состав оборудования и сценарии управления.
            </p>
          </div>
        </div>
      </section>

      <SolutionVisual
        src="/images/solutions/explainers/skladskie-kompleksy.png"
        alt="Инфографика РОСПАРК: автоматизация КПП и проездов складского комплекса"
      />

      <section className="py-12">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">
            Типовые проблемы складского объекта
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {problems.map((item) => (
              <article key={item.title} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="break-words text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 break-words text-slate-700">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-slate-50 py-12">
        <div className="container mx-auto grid max-w-6xl min-w-0 gap-8 px-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">
              Чем помогает РОСПАРК
            </h2>
            <p className="mt-4 leading-relaxed text-slate-700">
              Система объединяет оборудование, правила доступа и журнал событий, чтобы проезд через КПП был управляемым и понятным для эксплуатации.
            </p>
          </div>
          <ul className="grid gap-3 text-slate-700 sm:grid-cols-2">
            {managedItems.map((item) => (
              <li key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">
            Сценарии для складов и логистики
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {scenarios.map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-slate-500">
            Сценарии подбираются под устройство объекта: количество КПП, категории транспорта, внутренние зоны и регламенты допуска.
          </p>
        </div>
      </section>

      <section className="border-y bg-slate-50 py-12">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">
            Оборудование и компоненты
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {components.map((item) => (
              <article key={item.title} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="break-words text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 break-words text-slate-700">{item.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/oborudovanie" className="font-medium text-blue-700 hover:underline">
              Перейти в раздел оборудования →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto grid max-w-6xl min-w-0 gap-8 px-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">
              Интеграции и правила доступа
            </h2>
            <p className="mt-4 leading-relaxed text-slate-700">
              Для складского комплекса важна связка между заявкой, автомобилем, водителем, КПП и событием. РОСПАРК помогает выстроить эту логику без ручного хаоса на посту охраны.
            </p>
            <Link href="/resheniya/dlya-inzhenerov" className="mt-5 inline-flex font-medium text-blue-700 hover:underline">
              Подробнее для инженеров →
            </Link>
          </div>
          <ul className="space-y-3 text-slate-700">
            {integrationItems.map((item) => (
              <li key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y bg-slate-50 py-12">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">
            Полезные разделы
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {internalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-900 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">Вопросы по складским комплексам</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {faq.map((item) => (
              <article key={item.question} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-2 text-slate-700">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-600 py-16 text-white">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <div className="rounded-2xl bg-blue-700/30 p-6 sm:p-8 md:p-10">
            <h2 className="break-words text-2xl font-bold leading-tight md:text-3xl">
              Рассчитать конфигурацию для склада или логистического комплекса
            </h2>
            <p className="mt-4 max-w-3xl text-blue-100">
              Расскажите о количестве КПП, типах транспорта, пропускном режиме и внутренних правилах — подготовим безопасный состав решения без лишних обещаний и неподтверждённых цифр.
            </p>
            <div className="mt-8 flex min-w-0 flex-col gap-3 sm:flex-row">
              <Link href="/quiz?source=warehouse" className="inline-flex min-w-0 items-center justify-center rounded-xl bg-white px-6 py-4 text-center font-semibold leading-snug text-blue-700 shadow-sm transition-colors hover:bg-blue-50 sm:px-8">
                Рассчитать конфигурацию
              </Link>
              <Link href="/contacts" className="inline-flex min-w-0 items-center justify-center rounded-xl border border-white/40 bg-transparent px-6 py-4 text-center font-semibold leading-snug text-white transition-colors hover:bg-white/10 sm:px-8">
                Связаться
              </Link>
            </div>
          </div>

          <div id="lead" className="mx-auto mt-10 w-full max-w-4xl rounded-2xl bg-white p-5 sm:p-6 md:p-8">
            <LeadForm
              sourceSection="lead_cta"
              sourcePage="/resheniya/skladskie-kompleksy"
              submitLabel="Рассчитать конфигурацию"
            />
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto max-w-6xl min-w-0 px-4">
          <Link href="/" className="font-medium text-blue-600 hover:underline">
            ← На главную страницу РОСПАРК
          </Link>
        </div>
      </section>
    </main>
  );
}
