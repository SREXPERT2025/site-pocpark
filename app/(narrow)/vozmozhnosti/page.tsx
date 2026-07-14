import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import FeaturesShowcase from '@/app/components/FeaturesShowcase';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import TrustConversionBlocks from '@/app/components/content/TrustConversionBlocks';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { canonicalUrl } from '@/app/config/site-url';

type FeatureHubItem = {
  title: string;
  description: string;
  problem: string;
  href: string;
  group: 'client' | 'technology';
};

const featureItems: FeatureHubItem[] = [
  {
    title: 'Постоянные клиенты',
    description: 'Абонементы, распознавание номеров, RFID/BLE, правила доступа и отчётность.',
    problem: 'Резиденты и сотрудники должны проезжать быстро и без ручной проверки.',
    href: '/vozmozhnosti/postoyannie-klienti',
    group: 'client',
  },
  {
    title: 'Арендные клиенты',
    description: 'Доступ по компаниям, договорам, расписаниям, лимитам мест и реестрам автомобилей.',
    problem: 'У арендаторов разные права, лимиты и графики, а управление вручную быстро становится хаосом.',
    href: '/vozmozhnosti/arendnie-klienti',
    group: 'client',
  },
  {
    title: 'Разовые клиенты',
    description: 'Билет, номер автомобиля, тарифы, онлайн-оплата и автоматическое разрешение выезда.',
    problem: 'В часы пик появляются очереди на оплату и выезд, а спорные ситуации забирают время персонала.',
    href: '/vozmozhnosti/razovie-klienti',
    group: 'client',
  },
  {
    title: 'Гостевые клиенты',
    description: 'Заявки, временные окна доступа, подтверждение, аудит и автоматическое закрытие доступа.',
    problem: 'Гостей нужно пропускать удобно, но без потери контроля для охраны и управляющей компании.',
    href: '/vozmozhnosti/gostevie-klienti',
    group: 'client',
  },
  {
    title: 'Онлайн-оплата парковки',
    description: 'QR, сайт, Telegram, приложение, безналичные платежи и контроль неоплаченных выездов.',
    problem: 'Наличные, кассиры и ручные операции снижают прозрачность и увеличивают операционные расходы.',
    href: '/vozmozhnosti/onlain-oplata',
    group: 'technology',
  },
  {
    title: 'Распознавание номеров',
    description: 'Автоматический въезд и выезд по номеру для гостей, арендаторов и постоянных клиентов.',
    problem: 'Карты и билеты теряются, а ручная проверка номеров замедляет поток и создаёт ошибки.',
    href: '/vozmozhnosti/raspoznavanie-nomerov',
    group: 'technology',
  },
];

const groups = [
  {
    id: 'client',
    title: 'Сценарии по типам клиентов',
    description: 'Разные пользователи парковки требуют разных правил доступа, оплаты и отчётности.',
  },
  {
    id: 'technology',
    title: 'Технологии и оплата',
    description: 'Функции, которые чаще всего закладывают в проект на этапе выбора системы.',
  },
] as const;

type FeatureIllustrationProps = {
  id: string;
  title: string;
  src: string;
  alt: string;
  className?: string;
};

function FeatureIllustration({
  id,
  title,
  src,
  alt,
  className = '',
}: FeatureIllustrationProps) {
  return (
    <figure className={`min-w-0 ${className}`} aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="text-xl font-bold text-slate-950 sm:text-2xl">
        {title}
      </figcaption>
      <div className="relative mt-4 aspect-[1896/829] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 1088px, calc(100vw - 32px)"
          className="object-contain"
          unoptimized
        />
      </div>
    </figure>
  );
}

export const metadata: Metadata = {
  title: 'Возможности парковочной системы',
  description:
    'Возможности РОСПАРК для автоматизации парковки: сценарии клиентов, оплата, распознавание номеров и управление доступом.',
  alternates: {
    canonical: canonicalUrl('/vozmozhnosti'),
  },
  openGraph: {
    title: 'Возможности парковочной системы РОСПАРК',
    description:
      'Сценарии доступа, онлайн-оплата, распознавание номеров, гостевые заявки и отчётность для парковок.',
    url: canonicalUrl('/vozmozhnosti'),
    type: 'website',
  },
};

function FeatureItemListJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Возможности парковочной системы РОСПАРК',
    url: canonicalUrl('/vozmozhnosti'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: featureItems.map((item, index) => ({
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

export default function FeaturesPage() {
  return (
    <div className="overflow-hidden bg-slate-50">
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Возможности', url: '/vozmozhnosti' },
        ]}
      />
      <FeatureItemListJsonLd />

      <section className="bg-white px-4 py-12 sm:px-6 md:py-16">
        <div className="mx-auto max-w-[1088px]">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Возможности
            </p>
            <h1 className="mt-3 max-w-4xl break-words text-[30px] font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-4xl sm:leading-tight md:text-5xl">
              Сценарии доступа, оплаты и контроля для автоматизированной парковки
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              РОСПАРК проектируется как единая система: типы клиентов, правила доступа,
              онлайн-оплата, распознавание номеров, отчёты и действия оператора работают
              вместе, а не отдельными модулями.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quiz?source=features"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
            >
              Обсудить сценарий
            </Link>
            <Link
              href="#feature-map"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Посмотреть возможности
            </Link>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {[
              ['6', 'ключевых сценариев'],
              ['4', 'типа клиентов'],
              ['24/7', 'контроль доступа и событий'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="text-3xl font-bold text-slate-950">{value}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{label}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      <section id="feature-map" className="px-4 py-12 sm:px-6 md:py-16">
        <div className="mx-auto max-w-[1088px]">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Подберите возможность под задачу объекта
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Начните с проблемы, которую нужно решить: поток посетителей, арендаторы,
              резиденты, гости, оплата или идентификация автомобиля.
            </p>
          </div>

          <div className="mt-10 space-y-12">
            {groups.map((group) => (
              <div key={group.id}>
                <div className="max-w-3xl">
                  <h3 className="text-2xl font-bold text-slate-950">{group.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {featureItems
                    .filter((item) => item.group === group.id)
                    .map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Задача
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.problem}</p>

                        <div className="mt-5 text-lg font-bold text-slate-950">{item.title}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                        <span className="mt-4 inline-flex text-sm font-semibold text-blue-700">
                          Подробнее
                        </span>
                      </Link>
                    ))}
                </div>

                {group.id === 'client' ? (
                  <FeatureIllustration
                    id="client-scenarios-visual"
                    title="Четыре сценария доступа в одной системе"
                    src="/images/content/rospark-features-client-scenarios.webp"
                    alt="Четыре сценария доступа на парковку для постоянных, арендных, разовых и гостевых клиентов"
                    className="mt-8"
                  />
                ) : (
                  <FeatureIllustration
                    id="payment-anpr-visual"
                    title="Распознавание, оплата и автоматический выезд"
                    src="/images/content/rospark-features-payment-anpr.webp"
                    alt="Последовательность работы парковки: распознавание автомобиля, безналичная оплата и автоматический выезд"
                    className="mt-8"
                  />
                )}
              </div>
            ))}
          </div>

          <FeatureIllustration
            id="unified-control-visual"
            title="Единое управление парковкой"
            src="/images/content/rospark-features-unified-control.webp"
            alt="Единая система связывает въездное оборудование, оплату, рабочее место оператора и контроль безопасности"
            className="mt-12"
          />
        </div>
      </section>

      <FeaturesShowcase />

      <TrustConversionBlocks variant="features" />

      <LeadFormSection
        sourceSection="features_hub"
        sourcePage="/vozmozhnosti"
        title="Нужно собрать сценарий под конкретный объект?"
        description="Опишите объект и задачу, а мы подскажем, какие возможности стоит заложить сразу, какие можно подключить позже и кто отвечает за каждый этап."
        submitLabel="Обсудить сценарий"
        minimalFields
        className="bg-white"
      />
    </div>
  );
}
