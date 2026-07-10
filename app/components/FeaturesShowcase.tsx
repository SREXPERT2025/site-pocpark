'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

type SlideItem = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  placeholderColor: string;
};

type ShowcaseSection = {
  id: string;
  heading: string;
  items: SlideItem[];
};

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function PlaceholderImage({
  title,
  color,
}: {
  title: string;
  color: string;
}) {
  const style: CSSProperties = {
    background: `linear-gradient(135deg, ${color} 0%, #f8fafc 100%)`,
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl border border-slate-200"
      style={style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.5),transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),rgba(15,23,42,0.08))]" />

      <div className="relative flex h-full w-full items-center justify-center p-8">
        <div className="max-w-[80%] rounded-2xl bg-white/80 px-6 py-4 text-center shadow-sm backdrop-blur-sm">
          <div className="text-base font-semibold text-slate-800 md:text-lg">
            {title}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Временная заглушка вместо изображения
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCarousel({
  section,
}: {
  section: ShowcaseSection;
}) {
  const [index, setIndex] = useState(0);
  const total = section.items.length;
  const current = section.items[index];

  const goPrev = () => {
    setIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const goNext = () => {
    setIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  };

  return (
    <section
      className="mx-auto w-full max-w-[976px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8"
      aria-labelledby={`${section.id}-title`}
    >
      <h2
        id={`${section.id}-title`}
        className="mb-6 max-w-full break-words text-[28px] font-semibold leading-[1.15] text-slate-900 sm:text-2xl md:text-[30px]"
      >
        {section.heading}
      </h2>

      <div className="relative">
        <div className="relative overflow-hidden rounded-2xl bg-slate-50">
          <div className="relative aspect-[4/5] w-full min-h-[300px] sm:aspect-[16/9] sm:min-h-[380px] md:min-h-[500px]">
            <Image
              src={`/images/vozmozhnosti/${current.imageSrc}`}
              alt={current.title}
              fill
              className="object-cover rounded-xl"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.jpg';
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={goPrev}
          aria-label={`Предыдущее изображение в разделе "${section.heading}"`}
          className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-slate-900"
        >
          <ArrowLeftIcon />
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label={`Следующее изображение в разделе "${section.heading}"`}
          className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-slate-900"
        >
          <ArrowRightIcon />
        </button>
      </div>

      <div className="mt-5">
        <p className="max-w-full break-words text-base font-semibold leading-7 text-slate-900 md:text-[20px]">
          {current.title}
        </p>
        <p className="mt-3 max-w-full break-words text-sm leading-6 text-slate-600 md:text-base md:leading-7">
          {current.description}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {section.items.map((item, itemIndex) => {
          const isActive = itemIndex === index;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              aria-label={`Перейти к слайду "${item.title}"`}
              aria-pressed={isActive}
              className={[
                'h-2.5 rounded-full transition-all',
                isActive
                  ? 'w-10 bg-slate-900'
                  : 'w-2.5 bg-slate-300 hover:bg-slate-400',
              ].join(' ')}
            />
          );
        })}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="text-sm text-slate-500">
          Слайды в разделе: {index + 1} из {total}
        </div>
      </div>
    </section>
  );
}

export default function FeaturesShowcase() {
  const sections = useMemo<ShowcaseSection[]>(
    () => [
      {
        id: 'one-time-visitors',
        heading: 'Работа с разовыми посетителями',
        items: [
          {
            id: 'tariffs-constructor',
            title: 'Тарифы и конструктор',
            description:
              '16 алгоритмов с детальной настройкой помогают создать тарифы под объект и задачи. При необходимости можно разработать отдельный алгоритм тарификации на этапе изготовления оборудования.',
            imageSrc: 'vozmozhnosti-razovye-tarify-i-konstruktor.jpg',
            placeholderColor: '#dbeafe',
          },
          {
            id: 'entry-by-card-or-ticket',
            title: 'Въезд по карте или билету',
            description:
              'При въезде клиент получает карту или билет — идентификатор разового посетителя. По нему система рассчитывает время на парковке и сумму к оплате.',
            imageSrc: 'vozmozhnosti-razovye-vezd-po-karte-ili-biletu.jpg',
            placeholderColor: '#fde68a',
          },
          {
            id: 'fast-pass-without-cards',
            title: 'Быстрый проезд без карт',
            description:
              'Система может работать без физических носителей: автомобиль определяется по номеру с помощью камер. Это помогает повысить пропускную способность въездов и выездов.',
            imageSrc: 'vozmozhnosti-razovye-bystryi-proezd-bez-kart.jpg',
            placeholderColor: '#c7d2fe',
          },
          {
            id: 'custom-identifier',
            title: 'Свой идентификатор',
            description:
              'Мультисчитыватель позволяет использовать разные идентификаторы: ключ от домофона, электронный пропуск, банковскую карту и другие носители.',
            imageSrc: 'vozmozhnosti-razovye-svoi-identifikator.jpg',
            placeholderColor: '#fbcfe8',
          },
          {
            id: 'qr-invitations',
            title: 'QR-приглашения',
            description:
              'Управляющая компания и арендаторы могут отправлять гостям QR-приглашения. Гость проезжает по правилам объекта, а управляющий видит статистику по приглашениям и парковочному времени.',
            imageSrc: 'vozmozhnosti-razovye-qr-priglasheniya.jpg',
            placeholderColor: '#bbf7d0',
          },
          {
            id: 'discount-by-receipt',
            title: 'Предоставление скидок по чеку',
            description:
              'В терминал оплаты можно установить сканер QR- и штрихкодов. Гость сканирует чек и получает скидку на парковку в рублях или процентах по заданным правилам.',
            imageSrc: 'vozmozhnosti-razovye-skidki-po-cheku.jpg',
            placeholderColor: '#fed7aa',
          },
          {
            id: 'payment-by-tenant',
            title: 'Оплата за счёт арендатора',
            description:
              'Арендатор может отметить карту гостя в личном кабинете и разрешить бесплатный выезд. Управляющий получает отчёт по суммарному парковочному времени каждого арендатора.',
            imageSrc: 'vozmozhnosti-razovye-oplata-za-schet-arendatora.jpg',
            placeholderColor: '#ddd6fe',
          },
          {
            id: 'photo-fixation',
            title: 'Фотофиксация',
            description:
              'При каждом въезде и выезде система делает снимок. Это помогает разбирать спорные ситуации и проверять события по конкретному проезду.',
            imageSrc: 'vozmozhnosti-razovye-fotofiksaciya.jpg',
            placeholderColor: '#bfdbfe',
          },
        ],
      },
      {
        id: 'permanent-visitors',
        heading: 'Работа с постоянными посетителями',
        items: [
          {
            id: 'resident-card',
            title: 'Проезд по карте постоянного клиента',
            description:
              'В парковочные стойки встроены считыватели карт постоянных клиентов. Для проезда достаточно приложить карту, а система проверит права доступа и статус абонемента.',
            imageSrc: 'vozmozhnosti-postoyannye-proezd-po-karte-postoyannika.jpg',
            placeholderColor: '#e9d5ff',
          },
          {
            id: 'video-recognition',
            title: 'Видеораспознавание',
            description:
              'Камера в зоне проезда распознаёт номер автомобиля. Если номер есть в списке постоянных клиентов и нет ограничений, система открывает шлагбаум.',
            imageSrc: 'vozmozhnosti-postoyannye-videoraspaznavanie.jpg',
            placeholderColor: '#bae6fd',
          },
          {
            id: 'rfid',
            title: 'RFID',
            description:
              'Постоянным клиентам можно выдать RFID-метки. При подъезде антенна считывает метку, а система проверяет права доступа, оплату абонемента и связанные ограничения.',
            imageSrc: 'vozmozhnosti-postoyannye-rfid.png',
            placeholderColor: '#fecaca',
          },
          {
            id: 'tenant-space-limits',
            title: 'Лимиты мест на арендатора',
            description:
              'Для каждого арендатора можно настроить свой лимит парковочных мест. При достижении лимита система предупреждает о нём и применяет заданные правила въезда.',
            imageSrc: 'vozmozhnosti-postoyannye-limity-mest-na-arendatora.png',
            placeholderColor: '#d9f99d',
          },
        ],
      },
      {
        id: 'payments-and-reports',
        heading: 'Оплата и отчёты',
        items: [
          {
            id: 'payment-at-exit',
            title: 'Оплата на выезде',
            description:
              'В стойку выезда можно установить компактный терминал оплаты. Если у гостя есть задолженность за парковочное время, система покажет сумму к оплате и выдаст чек в виде QR-кода.',
            imageSrc: 'vozmozhnosti-oplata-oplata-na-vyezde.jpg',
            placeholderColor: '#fde68a',
          },
          {
            id: 'online-payment',
            title: 'Онлайн-оплата',
            description:
              'Клиент переходит на сайт, вводит номер карты или автомобиля и оплачивает парковку через удобный банк или платёжный сервис.',
            imageSrc: 'vozmozhnosti-oplata-onlain-oplata.jpg',
            placeholderColor: '#bfdbfe',
          },
          {
            id: 'automatic-shift-closing',
            title: 'Автоматическое закрытие смены',
            description:
              'В заданное время терминал оплаты может автоматически сформировать Z-отчёт и отправить его ответственным сотрудникам.',
            imageSrc: 'vozmozhnosti-oplata-avtomaticheskoe-zakrytie-smeny.jpg',
            placeholderColor: '#fecdd3',
          },
          {
            id: 'summary-report',
            title: 'Сводный отчёт о работе парковки',
            description:
              'Система показывает проезды по дням недели и часам, базовые метрики по выручке, пиковые периоды и другие показатели работы парковки.',
            imageSrc: 'vozmozhnosti-oplata-svodnyi-otchet.jpg',
            placeholderColor: '#c4b5fd',
          },
          {
            id: 'financial-report',
            title: 'Финансовый отчёт',
            description:
              'Финансовый отчёт помогает видеть распределение по типам оплаты, выручку по дням недели, структуру по тарифам и другие денежные показатели.',
            imageSrc: 'vozmozhnosti-oplata-finansovyi-otchet.jpg',
            placeholderColor: '#bbf7d0',
          },
          {
            id: 'event-log',
            title: 'Журнал событий',
            description:
              'Все ключевые события фиксируются в журнале: подъезд к стойкам, открытие шлагбаумов, выдача идентификаторов, оплаты, обслуживание терминалов и другие действия.',
            imageSrc: 'vozmozhnosti-oplata-zhurnal-sobytii.jpg',
            placeholderColor: '#fed7aa',
          },
        ],
      },
    ],
    []
  );

  return (
    <main className="overflow-hidden bg-slate-50 py-14 md:py-20">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 overflow-hidden px-4 sm:px-6">
        {sections.map((section) => (
          <SectionCarousel key={section.id} section={section} />
        ))}
      </div>
    </main>
  );
}