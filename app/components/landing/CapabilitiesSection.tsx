"use client";

import Image from "next/image";
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
        title: "Въезд без билета и карты",
        description:
          "Госномер автомобиля помогает открыть парковочную сессию без билета, карты и лишней очереди у кассы.",
        image: "/objects/bl_1_1.webp",
      },
      {
        title: "Въезд по билету или карте",
        description:
          "Парковочные карты, билеты и рулонные билеты подходят для объектов с высоким потоком и стабильной пропускной способностью.",
        image: "/objects/bl_1_2.webp",
      },
      {
        title: "Постоянные и гостевые клиенты",
        description:
          "RFID, госномер, BLE, QR-код — управляемый доступ для резидентов и гостей с понятным журналом перемещений.",
        image: "/objects/bl_1_3.webp",
      },
    ],
  },
  {
    id: "payments",
    label: "Управление выручкой",
    cards: [
      {
        title: "Терминалы и способы оплаты",
        description:
          "Кассовый терминал, оплата на выезде, оплата через сайт и бот — больше безналичных оплат и понятная сверка платежей.",
        image: "/objects/bl_2_1.webp",
      },
      {
        title: "Тарифы, скидки и абонементы",
        description:
          "Гибкие тарифы, скидки и абонементы помогают настроить парковку под экономику объекта и загрузку мест.",
        image: "/objects/bl_2_2.webp",
      },
      {
        title: "Отчёты по оплатам",
        description:
          "Наличные, безналичные платежи и оплата через сайт — прозрачная сверка и контроль денежных потоков без ручных операций.",
        image: "/objects/bl_2_3.webp",
      },
    ],
  },
  {
    id: "control",
    label: "Управление инфраструктурой",
    cards: [
      {
        title: "События и управленческая аналитика",
        description:
          "Журнал событий, выборки и показатели помогают принимать управленческие решения и повышать доходность объекта.",
        image: "/objects/bl_3_1.webp",
      },
      {
        title: "Роли и правила работы",
        description:
          "Гибкая модель ролей и прав помогает расширять процессы без потери контроля и безопасности.",
        image: "/objects/bl_3_2.webp",
      },
      {
        title: "Интеграции с внешними системами",
        description:
          "Интеграции с учётными, клиентскими и расчётными системами — единый контур управления парковочным активом.",
        image: "/objects/bl_3_3.webp",
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
        <div className="relative aspect-[16/9] w-full">
          <Image
            src={card.image}
            alt={card.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
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
          Как устроено управление парковкой
        </h2>

        <p className="mx-auto mt-4 max-w-3xl text-[18px] text-[#4B5563]">
          Система объединяет доступ, оплату и отчётность, чтобы парковкой было проще управлять каждый день.
        </p>

        {/* Tabs */}
        <div
          className="mx-auto mt-8 w-full max-w-[860px] overflow-hidden rounded-[20px] bg-[#F5F5F7] p-[2px]"
          role="group"
          aria-label="Раздел управления парковкой"
        >
          <div className="grid grid-cols-1 gap-[2px] sm:grid-cols-3">
            {GROUPS.map((group) => {
              const isActive = group.id === active;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActive(group.id)}
                  aria-pressed={isActive}
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
            Открыть все возможности
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
