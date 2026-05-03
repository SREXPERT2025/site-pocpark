const packages = [
  {
    level: "Базовый уровень",
    title: "Ниппельный выезд",
    description:
      "Минимальный формат автоматизации для зон погрузки, складов и служебных проездов.",
    scope: "Подходит для складов, логистических зон и технических въездов.",
    features: [
      "Контроллер + логика безопасности",
      "Монтаж и пусконаладка",
      "Автоматический режим «Ниппель»",
    ],
    priceFrom: "245 000 ₽",
    highlight: false,
  },
  {
    level: "Автоматизация",
    title: "Въезд по госномеру",
    description:
      "Автоматизированный доступ с распознаванием ГРНЗ для объектов с контролем потоков.",
    scope: "Оптимально для бизнес-центров, ТЦ и жилых комплексов.",
    features: [
      "LPR-камера + подсветка",
      "ПО распознавания и настройки",
      "Стойка въезда/выезда",
    ],
    priceFrom: "1 350 000 ₽",
    highlight: false,
  },
  {
    level: "Полная монетизация",
    title: "Автоматическая парковка",
    description:
      "Безбилетная система для объектов с высокой проходимостью и прозрачной монетизацией.",
    scope: "Рекомендуется для объектов с высоким трафиком.",
    features: [
      "Сценарии въезда/выезда",
      "Отчёты и админ-панель",
      "Гостевые и разовые клиенты",
    ],
    priceFrom: "2 000 000 ₽",
    highlight: false,
  },
  {
    level: "Стратегический уровень",
    title: "Парковочная система",
    description:
      "Полноценная цифровая платформа управления парковочным активом с интеграцией в ИТ-контур.",
    scope: "Рекомендуется для девелоперов и сетевых объектов.",
    features: [
      "Абонементы и роли доступа",
      "Интеграции и API",
      "Онлайн-оплата и уведомления",
    ],
    priceFrom: "2 500 000 ₽",
    highlight: true,
  },
];

export default function PriceList() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 sm:px-6">

        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[32px] font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Форматы внедрения и масштабирования
          </h2>

          <p className="mt-4 text-lg text-slate-600">
            Конфигурация формируется с учётом задач объекта,
            интенсивности трафика и финансовой модели проекта.
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Средний срок внедрения — от 3 до 8 недель.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            В большинстве проектов автоматизация снижает операционные расходы
            и повышает доходность объекта.
          </p>
        </div>

        <div className="mt-10 min-w-0 space-y-6 sm:mt-16">
          {packages.map((pkg) => (
            <div
              key={pkg.title}
              className={`w-full min-w-0 overflow-hidden rounded-2xl border p-5 transition sm:p-8 ${
                pkg.highlight
                  ? "border-blue-600 bg-[#F8FAFF] shadow-lg"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:gap-8">

                {/* ЛЕВАЯ ЧАСТЬ */}
                <div className="min-w-0 lg:w-[38%]">
                  <div className="mb-3 inline-block max-w-full rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {pkg.level}
                  </div>

                  <h3 className="max-w-full break-words text-[30px] font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-3xl">
                    {pkg.title}
                  </h3>

                  <p className="mt-3 text-slate-700 leading-relaxed">
                    {pkg.description}
                  </p>

                  <p className="mt-3 text-slate-600">
                    {pkg.scope}
                  </p>
                </div>

                {/* ЧТО ВХОДИТ */}
                <div className="min-w-0 lg:flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Что входит
                  </div>

                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex min-w-0 items-start gap-2 text-slate-700">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        <span className="min-w-0 break-words">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ПРАВАЯ ЧАСТЬ — ЦЕНА */}
                <div className="flex min-w-0 flex-col items-start justify-start text-left lg:min-w-[240px] lg:items-end lg:text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Бюджет от
                  </div>

                  <div className="mt-3 max-w-full break-words text-[28px] font-extrabold tracking-tight text-slate-900 sm:whitespace-nowrap sm:text-[clamp(28px,3.5vw,44px)]">
                    {pkg.priceFrom}
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Финальная конфигурация и бюджет формируются по результатам аудита объекта.
          Стоимость может меняться в зависимости от комплектации, количества въездов и интеграций.
        </p>

      </div>
    </section>
  );
}
