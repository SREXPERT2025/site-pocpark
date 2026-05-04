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
          "Госномер автомобиля и данные клиента помогают быстро открыть парковочную сессию без носителей и кассовых очередей.",
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
          "RFID, госномер, BLE, QR-код — управляемый доступ для резидентов и гостей с понятным журналом перемещений.",
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
          "Кассовый терминал, оплата на выезде, онлайн-оплата и Telegram-бот — больше безналичных оплат и понятная сверка платежей.",
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
    <div className="min-w-0 overflow-hidden rounded-[24px] border border-[#EFEFEF] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:rounded-[30px] sm:p-8">
      <h3 className="break-words text-[22px] font-bold leading-tight tracking-tight text-[#0B1020] sm:text-[24px]">
        {card.title}
      </h3>

      <p className="mt-3 break-words text-[16px] leading-relaxed text-[#4B5563]">
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
        <h2 className="mx-auto max-w-[820px] text-[32px] font-extrabold leading-tight tracking-tight text-[#0B1020] sm:text-[36px]">
          Архитектура управления парковочным активом
        </h2>

        <p className="mx-auto mt-4 max-w-3xl text-[18px] text-[#4B5563]">
          Система объединяет контроль доступа, оплату и отчётность, чтобы парковкой было проще управлять.
        </p>

        {/* Tabs */}
        <div className="mx-auto mt-8 w-full max-w-[860px] overflow-hidden rounded-[20px] bg-[#F5F5F7] p-[2px]">
          <div className="grid grid-cols-1 gap-[2px] sm:grid-cols-3">
            {GROUPS.map((group) => {
              const isActive = group.id === active;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActive(group.id)}
                  className={cn(
                    "min-h-[40px] min-w-0 rounded-[20px] px-4 py-2 text-[15px] leading-tight transition-colors sm:text-[16px]",
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

      <div className="mt-12 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {activeGroup.cards.map((card) => (
          <CapabilityCardView key={card.title} card={card} />
        ))}
      </div>
    </section>
  );
}
