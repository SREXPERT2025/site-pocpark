'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

type SlideItem = {
  id: string;
  title: string;
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
      className="mx-auto w-full max-w-[976px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
      aria-labelledby={`${section.id}-title`}
    >
      <h2
        id={`${section.id}-title`}
        className="mb-6 text-2xl font-semibold leading-tight text-slate-900 md:text-[30px]"
      >
        {section.heading}
      </h2>

      <div className="relative">
        <div className="relative overflow-hidden rounded-2xl bg-slate-50">
          <div className="relative aspect-[16/9] w-full min-h-[380px] md:min-h-[500px]">
            <PlaceholderImage
              title={current.imageSrc}
              color={current.placeholderColor}
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
        <p className="text-base font-medium leading-7 text-slate-800 md:text-[20px]">
          {current.title}
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
            title: 'Тарифы и конструктор. Короткий ответ: постоянные клиенты въезжают и выезжают автоматически — по номеру автомобиля, RFID-метке или BLE — а система сама применяет правила доступа, лимиты и формирует отчётность.',
            imageSrc: 'vozmozhnosti-razovye-tarify-i-konstruktor.webp',
            placeholderColor: '#dbeafe',
          },
          {
            id: 'entry-by-card-or-ticket',
            title: 'Въезд по карте или билету',
            imageSrc: 'vozmozhnosti-razovye-vezd-po-karte-ili-biletu.webp',
            placeholderColor: '#fde68a',
          },
          {
            id: 'fast-pass-without-cards',
            title: 'Быстрый проезд без карт',
            imageSrc: 'vozmozhnosti-razovye-bystryi-proezd-bez-kart.webp',
            placeholderColor: '#c7d2fe',
          },
          {
            id: 'custom-identifier',
            title: 'Свой идентификатор',
            imageSrc: 'vozmozhnosti-razovye-svoi-identifikator.webp',
            placeholderColor: '#fbcfe8',
          },
          {
            id: 'qr-invitations',
            title: 'QR-приглашения',
            imageSrc: 'vozmozhnosti-razovye-qr-priglasheniya.webp',
            placeholderColor: '#bbf7d0',
          },
          {
            id: 'discount-by-receipt',
            title: 'Предоставление скидок по чеку',
            imageSrc: 'vozmozhnosti-razovye-skidki-po-cheku.webp',
            placeholderColor: '#fed7aa',
          },
          {
            id: 'payment-by-tenant',
            title: 'Оплата за счет арендатора',
            imageSrc: 'vozmozhnosti-razovye-oplata-za-schet-arendatora.webp',
            placeholderColor: '#ddd6fe',
          },
          {
            id: 'photo-fixation',
            title: 'Фотофиксация',
            imageSrc: 'vozmozhnosti-razovye-fotofiksaciya.webp',
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
            title: 'Проезд по карте постоянника',
            imageSrc: 'vozmozhnosti-postoyannye-proezd-po-karte-postoyannika.webp',
            placeholderColor: '#e9d5ff',
          },
          {
            id: 'video-recognition',
            title: 'Видеораспознавание',
            imageSrc: 'vozmozhnosti-postoyannye-videoraspaznavanie.webp',
            placeholderColor: '#bae6fd',
          },
          {
            id: 'rfid',
            title: 'RFID',
            imageSrc: 'vozmozhnosti-postoyannye-rfid.webp',
            placeholderColor: '#fecaca',
          },
          {
            id: 'tenant-space-limits',
            title: 'Лимиты мест на арендатора',
            imageSrc: 'vozmozhnosti-postoyannye-limity-mest-na-arendatora.webp',
            placeholderColor: '#d9f99d',
          },
        ],
      },
      {
        id: 'payments-and-reports',
        heading: 'Оплата и отчеты',
        items: [
          {
            id: 'payment-at-exit',
            title: 'Оплата на выезде',
            imageSrc: 'vozmozhnosti-oplata-oplata-na-vyezde.webp',
            placeholderColor: '#fde68a',
          },
          {
            id: 'online-payment',
            title: 'Онлайн оплата',
            imageSrc: 'vozmozhnosti-oplata-onlain-oplata.webp',
            placeholderColor: '#bfdbfe',
          },
          {
            id: 'automatic-shift-closing',
            title: 'Автоматическое закрытие смены',
            imageSrc: 'vozmozhnosti-oplata-avtomaticheskoe-zakrytie-smeny.webp',
            placeholderColor: '#fecdd3',
          },
          {
            id: 'summary-report',
            title: 'Сводный отчет',
            imageSrc: 'vozmozhnosti-oplata-svodnyi-otchet.webp',
            placeholderColor: '#c4b5fd',
          },
          {
            id: 'financial-report',
            title: 'Финансовый отчет',
            imageSrc: 'vozmozhnosti-oplata-finansovyi-otchet.webp',
            placeholderColor: '#bbf7d0',
          },
          {
            id: 'event-log',
            title: 'Журнал событий',
            imageSrc: 'vozmozhnosti-oplata-zhurnal-sobytii.webp',
            placeholderColor: '#fed7aa',
          },
        ],
      },
    ],
    []
  );

  return (
    <main className="bg-slate-50 py-14 md:py-20">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-4 sm:px-6">
        {sections.map((section) => (
          <SectionCarousel key={section.id} section={section} />
        ))}
      </div>
    </main>
  );
}