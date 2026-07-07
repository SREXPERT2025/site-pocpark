import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { canonicalUrl } from '@/app/config/site-url';

type SolutionCard = {
  title: string;
  description: string;
  href: string;
  label: string;
};

const roleSolutions: SolutionCard[] = [
  {
    title: 'Для руководителей',
    description: 'Контроль выручки, загрузки парковки, затрат на персонал и прозрачная управленческая отчётность.',
    href: '/resheniya/dlya-rukovoditeley',
    label: 'Управление',
  },
  {
    title: 'Для инженеров',
    description: 'Архитектура решения, оборудование, интеграции, API, надёжность и сопровождение системы.',
    href: '/resheniya/dlya-inzhenerov',
    label: 'Техника',
  },
  {
    title: 'Для службы безопасности',
    description: 'Журнал событий, стоп-листы, контроль действий операторов, распознавание номеров и offline-сценарии.',
    href: '/resheniya/dlya-sluzhby-bezopasnosti',
    label: 'Контроль',
  },
];

const objectSolutions: SolutionCard[] = [
  {
    title: 'Торговые центры',
    description: 'Пиковый поток, бесплатное время, онлайн-оплата, льготы, арендаторы и минимум очередей на выезде.',
    href: '/resheniya/torgovye-centry',
    label: 'ТЦ',
  },
  {
    title: 'Бизнес-центры',
    description: 'Арендаторы, сотрудники, гости, лимиты мест, заявки, расписания и понятная отчётность для УК.',
    href: '/resheniya/biznes-centry',
    label: 'БЦ',
  },
  {
    title: 'Складские комплексы',
    description: 'КПП, грузовой транспорт, пропуска, расписания, журнал событий и контроль въезда подрядчиков.',
    href: '/resheniya/skladskie-kompleksy',
    label: 'Склад',
  },
  {
    title: 'Застройщики и ЖК',
    description: 'Резиденты, гости, управляющая компания, двор без хаоса и сценарии доступа после передачи объекта.',
    href: '/resheniya/zastroyschiki',
    label: 'ЖК',
  },
];

const scenarioLinks: SolutionCard[] = [
  {
    title: 'Как мы работаем',
    description: 'Пошаговый процесс внедрения: обследование, проектирование, монтаж, запуск, передача и поддержка.',
    href: '/resheniya/kak-my-rabotaem',
    label: 'Процесс',
  },
  {
    title: 'Стоимость автоматизации парковки',
    description: 'Из чего складывается бюджет: въезды, выезды, оборудование, онлайн-оплата, распознавание номеров и интеграции.',
    href: '/resheniya/stoimost-avtomatizacii-parkovki',
    label: 'Бюджет',
  },
  {
    title: 'Сравнение подходов',
    description: 'Чем отличается набор оборудования, локальная автоматизация и система парковки под ключ.',
    href: '/resheniya/sravnenie-podhodov',
    label: 'Выбор',
  },
];

const ecosystemLinks: SolutionCard[] = [
  {
    title: 'Оборудование',
    description: 'Шлагбаумы, терминалы оплаты, камеры распознавания номеров, контроллеры и периферия.',
    href: '/oborudovanie',
    label: 'Состав',
  },
  {
    title: 'Проекты',
    description: 'Примеры внедрений на торговых объектах, бизнес-центрах, гостиницах, ЖК и других парковках.',
    href: '/keysy',
    label: 'Опыт',
  },
  {
    title: 'Возможности',
    description: 'Постоянные, арендные, разовые и гостевые клиенты, онлайн-оплата и распознавание номеров.',
    href: '/vozmozhnosti',
    label: 'Функции',
  },
];

export const metadata: Metadata = {
  title: 'Решения РОСПАРК для автоматизации парковок',
  description:
    'Решения РОСПАРК для ТЦ, БЦ, складских комплексов, ЖК, руководителей, инженеров и служб безопасности: доступ, оплата, контроль и внедрение под ключ.',
  alternates: {
    canonical: canonicalUrl('/resheniya'),
  },
  openGraph: {
    title: 'Решения РОСПАРК для автоматизации парковок',
    description:
      'Выберите сценарий парковочной системы по роли, типу объекта или этапу внедрения.',
    url: canonicalUrl('/resheniya'),
    type: 'website',
  },
};

function SolutionsItemListJsonLd() {
  const items = [...roleSolutions, ...objectSolutions, ...scenarioLinks, ...ecosystemLinks];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Решения РОСПАРК',
    url: canonicalUrl('/resheniya'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: canonicalUrl(item.href),
        item: {
          '@type': 'WebPage',
          name: item.title,
          description: item.description,
          url: canonicalUrl(item.href),
        },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function SolutionGrid({
  id,
  eyebrow,
  title,
  description,
  items,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: SolutionCard[];
}) {
  return (
    <section id={id} className="px-4 py-12 sm:px-6 md:py-16">
      <div className="mx-auto max-w-[1088px]">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-[230px] flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-md"
            >
              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 group-hover:bg-white">
                {item.label}
              </span>
              <h3 className="mt-5 text-xl font-bold text-slate-950">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{item.description}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-blue-700">
                Перейти к решению
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function SolutionsPage() {
  return (
    <main className="overflow-hidden bg-slate-50">
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Решения', url: '/resheniya' },
        ]}
      />
      <SolutionsItemListJsonLd />

      <section className="bg-white px-4 py-12 sm:px-6 md:py-16">
        <div className="mx-auto max-w-[1088px]">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Решения РОСПАРК
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-5xl">
              Парковочная система под задачу объекта, роли и этап внедрения
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              РОСПАРК помогает собрать единый сценарий парковки: въезд и выезд,
              оплату, доступы, роли операторов, отчётность, оборудование и поддержку.
              Начните с типа объекта или с того, кто принимает решение.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quiz?source=solutions"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
            >
              Подобрать решение
            </Link>
            <Link
              href="#objects"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Смотреть по объектам
            </Link>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {[
              ['3', 'роли в проекте'],
              ['4', 'типа объектов'],
              ['1', 'единый контур доступа, оплаты и контроля'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="text-3xl font-bold text-slate-950">{value}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SolutionGrid
        id="roles"
        eyebrow="По ролям"
        title="Для тех, кто отвечает за результат"
        description="Разные участники проекта смотрят на парковку по-разному: бизнесу важна экономика, инженерам архитектура, безопасности контроль событий."
        items={roleSolutions}
      />

      <SolutionGrid
        id="objects"
        eyebrow="По объектам"
        title="Подберите сценарий под тип парковки"
        description="ТЦ, БЦ, склад и жилой комплекс отличаются потоком, правилами доступа, оплатой и ролью персонала на объекте."
        items={objectSolutions}
      />

      <SolutionGrid
        id="process"
        eyebrow="Процесс и выбор подхода"
        title="Понять внедрение до старта работ"
        description="Перед закупкой оборудования важно зафиксировать сценарии, зоны ответственности и ограничения текущей инфраструктуры."
        items={scenarioLinks}
      />

      <SolutionGrid
        id="ecosystem"
        eyebrow="Связанные разделы"
        title="Проверьте состав системы, функции и опыт внедрений"
        description="Хаб решений связывает коммерческий сценарий с оборудованием, возможностями и реальными проектами."
        items={ecosystemLinks}
      />

      <LeadFormSection
        sourceSection="solutions_hub"
        sourcePage="/resheniya"
        title="Нужно понять, какое решение подходит вашему объекту?"
        description="Опишите объект и задачу. Подскажем сценарий доступа, состав системы и следующий шаг без лишней детализации на старте."
        submitLabel="Подобрать решение"
        minimalFields
        className="bg-white"
      />
    </main>
  );
}
