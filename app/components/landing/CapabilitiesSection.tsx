"use client";

import Link from "next/link";
import React from "react";

type CapabilityCard = {
  title: string;
  description: string;
  image: string; // public path
};

type CapabilityGroup = {
  id: "access" | "payments" | "control";
  label: string;
  cards: [CapabilityCard, CapabilityCard, CapabilityCard];
};

const GROUPS: CapabilityGroup[] = [
  {
    id: "access",
    label: "Проезд и доступ",
    cards: [
      {
        title: "Без выдачи разовых идентификаторов",
        description: "ГРНЗ и собственный идентификатор — быстрый запуск без носителей.",
        image: "/objects/bl_1_1.png",
      },
      {
        title: "С выдачей идентификаторов",
        description: "Паркинг‑карты, билеты, fan‑fold — привычные сценарии для объектов с потоком.",
        image: "/objects/bl_1_2.png",
      },
      {
        title: "Постоянные и гостевые пользователи",
        description: "Карты, RFID, ГРНЗ, BLE, QR‑код — удобный доступ для резидентов и гостей.",
        image: "/objects/bl_1_3.png",
      },
    ],
  },
  {
    id: "payments",
    label: "Оплата и монетизация",
    cards: [
      {
        title: "Терминалы и каналы оплаты",
        description: "Кассовый терминал, оплата на выезде, онлайн‑оплата и Telegram‑bot.",
        image: "/objects/bl_2_1.png",
      },
      {
        title: "Тарифы и программы",
        description: "Гибкие тарифы, скидки и абонементы — настройка под бизнес‑модель объекта.",
        image: "/objects/bl_2_2.png",
      },
      {
        title: "Отчеты по оплатам",
        description: "Наличные, безналичные и онлайн‑платежи — прозрачная сверка и контроль кассы.",
        image: "/objects/bl_2_3.png",
      },
    ],
  },
  {
    id: "control",
    label: "Контроль и интеграции",
    cards: [
      {
        title: "События и аналитика",
        description: "Журнал событий, выборки и метрики — основание для управленческих решений.",
        image: "/objects/bl_3_1.png",
      },
      {
        title: "Роли и сценарии",
        description: "Роли/права и сценарии работы — масштабирование процессов без потери контроля.",
        image: "/objects/bl_3_2.png",
      },
      {
        title: "API и интеграции",
        description: "Интеграции с внешними системами и сервисами — единый контур автоматизации.",
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
    <div className="rounded-[30px] border border-[#EFEFEF] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] p-7 md:p-8">
      <h3 className="text-[22px] md:text-[24px] font-extrabold tracking-tight text-[#0B1020]">
        {card.title}
      </h3>
      <p className="mt-3 text-[15px] md:text-[16px] leading-relaxed text-[#4B5563]">
        {card.description}
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#EFEFEF] bg-[#F5F5F7]">
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
  const [active, setActive] = React.useState<CapabilityGroup["id"]>("access");

  const activeGroup = React.useMemo(
    () => GROUPS.find((g) => g.id === active) ?? GROUPS[0],
    [active]
  );

  return (
    <section className="mt-section">
      <div className="text-center">
        <h2 className="text-[32px] md:text-[36px] font-extrabold tracking-tight text-[#0B1020]">
          Основные возможности системы
        </h2>

        <div className="mx-auto mt-6 w-full max-w-[860px] rounded-[20px] bg-[#F5F5F7] p-[2px]">
          <div className="flex items-center gap-[2px]">
            {GROUPS.map((group) => {
              const isActive = group.id === active;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActive(group.id)}
                  className={cn(
                    "h-[38px] flex-1 whitespace-nowrap rounded-[20px] px-3 md:px-6 text-[15px] md:text-[18px] leading-none transition-colors",
                    isActive
                      ? "bg-[#1A1A1A] text-white"
                      : "text-[#242424]/70 hover:text-[#242424]"
                  )}
                  aria-pressed={isActive}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <Link
            href="/vozmozhnosti"
            className="text-[16px] md:text-[17px] font-bold text-[#0066CC] hover:underline"
          >
            Перейти в раздел всех возможностей системы
          </Link>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {activeGroup.cards.map((card) => (
          <CapabilityCardView key={card.title} card={card} />
        ))}
      </div>
    </section>
  );
}
