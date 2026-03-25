'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

type Feature = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  tags: string[];
  media: {
    src: string;
    alt: string;
  };
};

export default function FeaturesShowcase() {
  const features: Feature[] = useMemo(
    () => [
      {
        id: 'access',
        title: 'Быстрый въезд без карт',
        subtitle: 'Проезд по номеру или смартфону без очередей.',
        description:
          'Автоматический въезд по ГРНЗ (ANPR) или BLE/UHF — без жетонов и ручного контроля. Система сама распознаёт автомобиль и открывает проезд.',
        bullets: [
          'Проезд без остановки и очередей',
          'Поддержка ANPR, BLE, UHF',
          'Единая логика для гостей и резидентов',
        ],
        tags: ['ЖК', 'БЦ', 'ТРЦ'],
        media: { src: '/images/features/01-access.jpg', alt: 'Въезд без карт' },
      },
      {
        id: 'clients',
        title: 'Контроль постоянных клиентов',
        subtitle: 'Резиденты и арендаторы под полным контролем.',
        description:
          'Гибкое управление доступом постоянных клиентов: статусы, расписания, ограничения и прозрачная история проездов.',
        bullets: [
          'Разграничение прав доступа',
          'Индивидуальные правила въезда',
          'История и контроль событий',
        ],
        tags: ['ЖК', 'БЦ'],
        media: { src: '/images/features/02-tenants.jpg', alt: 'Постоянные клиенты' },
      },
      {
        id: 'tariffs',
        title: 'Гибкие тарифы и сценарии',
        subtitle: 'Настройка под экономику объекта.',
        description:
          'Поддержка абонементов, льгот, гостевых сценариев и автоматического расчёта оплаты без ручного вмешательства.',
        bullets: [
          'Абонементы и льготы',
          'Автоматический расчёт',
          'Прозрачность для бухгалтерии',
        ],
        tags: ['ТРЦ', 'БЦ'],
        media: { src: '/images/features/03-tariffs.jpg', alt: 'Тарифы' },
      },
      {
        id: 'antifraud',
        title: 'Защита от злоупотреблений',
        subtitle: 'Анти-фрод и дисциплина доступа.',
        description:
          'Система выявляет аномалии, повторные проезды и подозрительные сценарии, снижая финансовые потери.',
        bullets: [
          'Контроль аномалий',
          'Журналы событий',
          'Гибкие блокировки',
        ],
        tags: ['Безопасность'],
        media: { src: '/images/features/04-antifraud.jpg', alt: 'Анти-фрод' },
      },
      {
        id: 'online',
        title: 'Онлайн-контроль и аналитика',
        subtitle: 'Управление и отчёты в реальном времени.',
        description:
          'Единая панель контроля: события, оборудование, отчёты и аналитика без выезда на объект.',
        bullets: [
          'Онлайн-статусы',
          'Отчёты и аналитика',
          'Удалённое управление',
        ],
        tags: ['Директор', 'УК'],
        media: { src: '/images/features/05-dashboard.jpg', alt: 'Онлайн-контроль' },
      },
    ],
    []
  );

  const [activeId, setActiveId] = useState(features[0].id);
  const active = features.find((f) => f.id === activeId)!;

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-4xl font-semibold">Возможности системы</h2>
        <p className="mt-4 text-neutral-600 max-w-3xl">
          Коротко и наглядно: что получает клиент и как это работает на практике.
        </p>

        <div className="mt-12 grid md:grid-cols-2 gap-10">
          <div className="space-y-3">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveId(f.id)}
                className={`w-full text-left rounded-2xl border p-5 transition ${
                  f.id === activeId
                    ? 'bg-neutral-50 border-neutral-400'
                    : 'bg-white border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="font-medium">{f.title}</div>
                <div className="text-sm text-neutral-600">{f.subtitle}</div>
              </button>
            ))}
          </div>

          <div className="sticky top-24">
            <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={active.media.src}
                    alt={active.media.alt}
                    fill
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="mt-4 text-sm text-neutral-600">
              {active.description}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
