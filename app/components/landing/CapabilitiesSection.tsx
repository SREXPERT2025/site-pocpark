"use client";

import Link from "next/link";
import React from "react";

type CapabilityCard = {
  title: string;
  description: string;
  image: string;
};

type CapabilityGroup = {
  id: "access" | "payments" | "control";
  label: string;
  cards: [CapabilityCard, CapabilityCard, CapabilityCard];
};

const GROUPS: CapabilityGroup[] = [
  {
    id: "access",
    label: "Управление доступом",
    cards: [
      {
        title: "Без выдачи разовых идентификаторов",
        description:
          "ГРНЗ и цифровой идентификатор — быстрый запуск без носителей и кассовых очередей, снижая операционные затраты и нагрузку на персонал.",
        image: "/objects/bl_1_1.png",
      },
      {
        title: "С выдачей идентификаторов",
        description:
          "Паркинг-карты, билеты, fan-fold — привычные сценарии для объектов с высоким потоком, обеспечивая стабильную пропускную способность.",
        image: "/objects/bl_1_2.png",
      },
      {
        title: "Постоянные и гостевые пользователи",
        description:
          "RFID, ГРНЗ, BLE, QR-код — управляемый доступ для резидентов и гостей с полной прозрачностью перемещений.",
        image: "/objects/bl_1_3.png",
      },
    ],
  },
  {
    id: "payments",
    label: "Управление выручкой",
    cards: [
      {
        title: "Терминалы и каналы оплаты",
        description:
          "Кассовый терминал, оплата на выезде, онлайн-оплата и Telegram-bot — увеличение доли безналичных платежей и прозрачная монетизация.",
        image: "/objects/bl_2_1.png",
      },
      {
        title: "Тарифы и программы",
        description:
          "Гибкие тарифы, скидки и абонементы — настройка под бизнес-модель объекта и оптимизация загрузки парковки.",
        image: "/objects/bl_2_2.png",
      },
      {
        title: "Отчеты по оплатам",
        description:
          "Наличные, безналичные и онлайн-платежи — прозрачная сверка и контроль финансовых потоков без ручных операций.",
        image: "/objects/bl_2_3.png",
      },
    ],
  },
  {
    id: "control",
    label: "Управление инфраструктурой",
    cards: [
      {
        title: "События и аналитика",
        description:
          "Журнал событий, выборки и метрики — основа управленческих решений и повышения доходности объекта.",
        image: "/objects/bl_3_1.png",
      },
      {
        title: "Роли и сценарии",
        description:
          "Гибкая модель ролей и прав — масштабирование процессов без потери контроля и безопасности.",
        image: "/objects/bl_3_2.png",
      },
      {
        title: "API и интеграции",
        description:
          "Интеграции с ERP, CRM и биллингом — единый цифровой контур управления парковочным активом.",
        image: "/objects/bl_3_3.png",
      },
    ],
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function CapabilityCardView({ card }: { card: CapabilityCard }) {
  return (
    <div className="rounded-[30px] border border-[#EFEFEF] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] p-8">
      <h3 className="text-[24px] font-bold tracking-tight text-[#0B1020]">
        {card.title}
      </h3>

      <p className="mt-3 text-[16px] leading-relaxed text-[#4B5563]">
        {card.description}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#EFEFEF] bg-[#F5F5F7]">
        <div className="aspect-[16/9] w-full">
          <img
            src={card.image}
            alt={card.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

export default function CapabilitiesSection() {
  const [active, setActive] =
    React.useState<CapabilityGroup["id"]>("access");

  const activeGroup = React.useMemo(
    () => GROUPS.find((g) => g.id === active) ?? GROUPS[0],
    [active]
  );

  return (
    <section className="mt-section">
      <div className="text-center">
        <h2 className="text-[36px] font-extrabold tracking-tight text-[#0B1020]">
          Архитектура управления парковочным активом
        </h2>

        <p className="mx-auto mt-4 max-w-3xl text-[18px] text-[#4B5563]">
          Платформа объединяет контроль доступа, монетизацию и аналитику —
          формируя управляемый доходный актив.
        </p>

        {/* Tabs */}
        <div className="mx-auto mt-8 w-full max-w-[860px] rounded-[20px] bg-[#F5F5F7] p-[2px]">
          <div className="flex items-center gap-[2px]">
            {GROUPS.map((group) => {
              const isActive = group.id === active;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActive(group.id)}
                  className={cn(
                    "h-[40px] flex-1 whitespace-nowrap rounded-[20px] px-4 text-[16px] transition-colors",
                    isActive
                      ? "bg-[#1A1A1A] text-white"
                      : "text-[#242424]/70 hover:text-[#242424]"
                  )}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <Link
            href="/vozmozhnosti"
            className="text-[17px] font-semibold text-[#0066CC] hover:underline"
          >
            Перейти в полный раздел возможностей
          </Link>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {activeGroup.cards.map((card) => (
          <CapabilityCardView key={card.title} card={card} />
        ))}
      </div>
    </section>
  );
}
