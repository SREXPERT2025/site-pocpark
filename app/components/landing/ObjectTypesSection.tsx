import Link from "next/link";

type ObjectTypeCardItem = {
  title: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
};

const objectTypes: ObjectTypeCardItem[] = [
  {
    title: "Торговые центры",
    href: "/resheniya/torgovye-centry",
    imageSrc: "/images/object-types/tc.jpg",
    imageAlt: "Торговый центр",
  },
  {
    title: "Бизнес центры",
    href: "/resheniya/biznes-centry",
    imageSrc: "/images/object-types/bc.jpg",
    imageAlt: "Бизнес-центр",
  },
  {
    title: "Жилые комплексы",
    href: "/resheniya/zastroyschiki",
    imageSrc: "/images/object-types/jk.jpg",
    imageAlt: "Жилой комплекс",
  },
];

function ObjectTypeCard({ item }: { item: ObjectTypeCardItem }) {
  return (
    <Link
      href={item.href}
      className="group block w-full max-w-[387px] overflow-hidden rounded-[30px] bg-slate-950 shadow-sm ring-1 ring-slate-200/70 transition hover:shadow-md"
    >
      <div className="relative h-[258px] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageSrc}
          alt={item.imageAlt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex h-[84px] items-center justify-center bg-[#1D1D1F] px-6 text-center">
        <h3 className="text-[24px] font-black leading-[28px] tracking-[-0.01em] text-white">
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
          <h2 className="text-[40px] font-black leading-[44px] tracking-[-0.02em] text-slate-950">
            Решения под ваш тип объекта
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 justify-items-center gap-8 md:grid-cols-3">
          {objectTypes.map((item) => (
            <ObjectTypeCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
