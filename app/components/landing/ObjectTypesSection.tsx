import Link from "next/link";

type ObjectTypeCardItem = {
  title: string;
  href: string;
  imageSrc: string;
  imageAlt: string;

  /** Короткий тег (2–3 слова) */
  tag: string;

  /** 1 строка “фокус/эффект” (коротко, без KPI-цифр) */
  focus: string;
};

const objectTypes: ObjectTypeCardItem[] = [
  {
    title: "Торговые центры",
    href: "/resheniya/torgovye-centry",
    imageSrc: "/images/object-types/tc.jpg",
    imageAlt: "Торговый центр",
    tag: "Монетизация трафика",
    focus: "Управляемая ротация и контроль пиковых нагрузок.",
  },
  {
    title: "Бизнес-центры",
    href: "/resheniya/biznes-centry",
    imageSrc: "/images/object-types/bc.jpg",
    imageAlt: "Бизнес-центр",
    tag: "Абонементы и СКУД",
    focus: "Резиденты, гости, арендаторы — прозрачный контроль доступа.",
  },
  {
    title: "Жилые комплексы",
    href: "/resheniya/zastroyschiki",
    imageSrc: "/images/object-types/jk.jpg",
    imageAlt: "Жилой комплекс",
    tag: "Резиденты и гости",
    focus: "Автоматизация гостевых сценариев и снижение конфликтов.",
  },
];

function ObjectTypeCard({ item }: { item: ObjectTypeCardItem }) {
  return (
    <Link
      href={item.href}
      className={[
        "group block w-full max-w-[387px] overflow-hidden rounded-[30px]",
        "bg-slate-950 shadow-sm ring-1 ring-slate-200/70 transition",
        "hover:shadow-md hover:-translate-y-[2px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
      ].join(" ")}
      aria-label={`${item.title}: ${item.focus}`}
    >
      <div className="relative h-[258px] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageSrc}
          alt={item.imageAlt}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />

        {/* мягкий градиент для читаемости + “тег” */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />

        <div className="absolute left-4 top-4">
          <span className="inline-flex items-center rounded-full bg-white/85 px-3 py-1 text-[12px] font-semibold tracking-[0.02em] text-slate-900 shadow-sm">
            {item.tag}
          </span>
        </div>

        {/* микро-подсказка (появляется на hover, не раздувает блок) */}
        <div className="pointer-events-none absolute bottom-4 left-4 right-4">
          <div className="rounded-2xl bg-black/55 px-4 py-3 opacity-0 transition duration-200 group-hover:opacity-100">
            <p className="text-[13px] leading-[18px] text-white/90">{item.focus}</p>
          </div>
        </div>
      </div>

      {/* нижняя планка: оставляем максимально чистой */}
      <div className="flex h-[84px] items-center justify-center bg-[#1D1D1F] px-6 text-center">
        <h3 className="text-[24px] font-extrabold leading-[28px] tracking-[-0.01em] text-white">
          {item.title}
        </h3>
      </div>
    </Link>
  );
}

export default function ObjectTypesSection() {
  return (
    <section className="mt-section">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-[40px] font-extrabold leading-[44px] tracking-[-0.02em] text-slate-950">
            Модели управления парковкой по типу объекта
          </h2>
          <p className="mx-auto mt-3 max-w-[820px] text-[18px] leading-[24px] text-slate-600">
            Для каждого актива — своя логика монетизации, контроль трафика и финансовая архитектура.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 justify-items-center gap-8 md:grid-cols-3">
          {objectTypes.map((item) => (
            <ObjectTypeCard key={item.title} item={item} />
          ))}
        </div>

        {/* 1 аккуратная строка вместо “KPI-цифр” */}
        <p className="mx-auto mt-6 max-w-[920px] text-center text-[12px] leading-[16px] text-slate-500">
          Финальная конфигурация зависит от сценариев пользователей, трафика и интеграций объекта.
        </p>
      </div>
    </section>
  );
}
