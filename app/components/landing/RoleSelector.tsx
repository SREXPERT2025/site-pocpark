import Link from "next/link";

type RoleCardItem = {
  title: string;
  description: string;
  result: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  accent?: boolean;
};

const roles: RoleCardItem[] = [
  {
    title: "Для руководителей",
    description:
      "NOI и прозрачная выручка в реальном времени. Управляемость парковочного актива.",
    result:
      "Прогнозируемый финансовый результат и контроль доходности объекта.",
    href: "/resheniya/dlya-rukovoditeley",
    imageSrc: "/images/roles/leader.jpg",
    imageAlt: "Руководитель за ноутбуком",
    accent: true,
  },
  {
    title: "Для инженеров",
    description:
      "API, протоколы и схемы подключения. Совместимость с ИТ-контуром объекта.",
    result:
      "Интеграция без ручных доработок и архитектурных конфликтов.",
    href: "/resheniya/dlya-inzhenerov",
    imageSrc: "/images/roles/engineer.jpg",
    imageAlt: "Инженер за рабочим местом",
  },
  {
    title: "Для службы безопасности",
    description:
      "Черные и белые списки, распознавание номеров и журнал событий.",
    result:
      "Снижение операционных рисков и полный контроль доступа.",
    href: "/resheniya/dlya-sluzhby-bezopasnosti",
    imageSrc: "/images/roles/security.jpg",
    imageAlt: "Сотрудник службы безопасности",
  },
];

function RoleCard({ item }: { item: RoleCardItem }) {
  return (
    <div
      className={`w-full max-w-[387px] overflow-hidden rounded-[30px] transition-all duration-300 
      ${
        item.accent
          ? "bg-gradient-to-b from-[#1D1F25] to-[#181A20] border border-blue-500/40 shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
          : "bg-[#1D1D1F] shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
      }
      hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(0,0,0,0.35)]`}
    >
      <div className="h-[258px] w-full bg-black/5">
        <img
          src={item.imageSrc}
          alt={item.imageAlt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex flex-col items-center px-8 pb-10 pt-8 text-center">
        <p className="text-[12px] tracking-[0.12em] text-blue-400/80 uppercase">
          {item.title === "Для руководителей"
            ? "Финансовое управление"
            : item.title === "Для инженеров"
            ? "Интеграции и архитектура"
            : "Контроль и безопасность"}
        </p>

        <h3 className="mt-2 text-[26px] font-extrabold text-white">
          {item.title}
        </h3>

        <p className="mt-4 text-[16px] leading-[22px] text-white/85">
          {item.description}
        </p>

        <div className="my-6 h-px w-12 bg-white/20" />

        <p className="text-[15px] font-medium text-white/90">
          {item.result}
        </p>

        <Link
          href={item.href}
          className="mt-8 inline-flex items-center gap-2 text-[16px] text-blue-400 hover:text-blue-300 transition-colors"
        >
          Подробнее <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}

export default function RoleSelector() {
  return (
    <section className="mt-section">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-[38px] font-extrabold tracking-[-0.02em] text-slate-950">
            Платформа для всех уровней управления парковочным активом
          </h2>

          <p className="mt-4 text-[18px] text-slate-600">
            Инструменты для принятия решений — от ежедневного контроля до стратегического роста доходности.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 justify-items-center gap-8 md:grid-cols-3">
          {roles.map((role) => (
            <RoleCard key={role.title} item={role} />
          ))}
        </div>

        <div className="mt-12 text-center text-[15px] text-slate-500">
          Более 350 объектов используют платформу на разных уровнях управления.
        </div>
      </div>
    </section>
  );
}
