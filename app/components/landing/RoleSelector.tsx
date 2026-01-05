import Link from "next/link";

type RoleCardItem = {
  title: string;
  description: string;
  href: string;
  /**
   * Путь к картинке в /public. Если файла нет — сборка всё равно пройдет.
   * Пример: /images/roles/leader.jpg
   */
  imageSrc: string;
  imageAlt: string;
};

const roles: RoleCardItem[] = [
  {
    title: "Для руководителей",
    description: "Управляемость, рост выручки (NOI), прозрачные отчеты, контроль денег.",
    href: "/resheniya/dlya-rukovoditeley",
    imageSrc: "/images/roles/leader.jpg",
    imageAlt: "Руководитель за ноутбуком",
  },
  {
    title: "Для инженеров",
    description: "Надежные протоколы, API, схемы подключения, техническая поддержка 24/7.",
    href: "/resheniya/dlya-inzhenerov",
    imageSrc: "/images/roles/engineer.jpg",
    imageAlt: "Инженер за рабочим местом",
  },
  {
    title: "Для службы безопасности",
    description:
      "Полный контроль, черные и белые списки, распознавание номеров, надежность.",
    href: "/resheniya/dlya-sluzhby-bezopasnosti",
    imageSrc: "/images/roles/security.jpg",
    imageAlt: "Сотрудник службы безопасности",
  },
];

function RoleCard({ item }: { item: RoleCardItem }) {
  return (
    <div className="w-full max-w-[387px] overflow-hidden rounded-[30px] bg-[#1D1D1F] shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
      {/* Верхнее изображение */}
      <div className="h-[258px] w-full bg-black/5">
        {/*
          Важно: используем обычный img, чтобы билд не зависел от наличия файла.
          Картинки положите в /public/images/roles/*.jpg
        */}
        <img
          src={item.imageSrc}
          alt={item.imageAlt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Нижний блок */}
      <div className="flex flex-col items-center px-8 pb-10 pt-8 text-center">
        <h3 className="text-[28px] font-black leading-[28px] tracking-[-0.01em] text-white">
          {item.title}
        </h3>

        <p className="mt-4 text-[17px] leading-[20px] text-white/85">
          {item.description}
        </p>

        <Link
          href={item.href}
          className="mt-10 inline-flex items-center gap-2 text-[17px] leading-[20px] text-[#00FFFF] hover:text-[#00FFFF]/90"
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
          <h2 className="text-[40px] font-black leading-[44px] tracking-[-0.02em] text-slate-950">
            Мы говорим на вашем языке
          </h2>
          <p className="mt-3 text-[18px] leading-[24px] text-slate-600">
            Выберите вашу роль, чтобы увидеть релевантные возможности системы
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 justify-items-center gap-8 md:grid-cols-3">
          {roles.map((role) => (
            <RoleCard key={role.title} item={role} />
          ))}
        </div>
      </div>
    </section>
  );
}
