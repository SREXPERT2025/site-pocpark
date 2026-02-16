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
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">

        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
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

        <div className="mt-16 space-y-6">
          {packages.map((pkg) => (
            <div
              key={pkg.title}
              className={`rounded-2xl border p-8 transition ${
                pkg.highlight
                  ? "border-blue-600 shadow-lg bg-[#F8FAFF]"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div className="flex flex-col gap-8 lg:flex-row">

                {/* ЛЕВАЯ ЧАСТЬ */}
                <div className="lg:w-[38%]">
                  <div className="mb-3 inline-block rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {pkg.level}
                  </div>

                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
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
                <div className="lg:flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Что входит
                  </div>

                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-slate-700">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ПРАВАЯ ЧАСТЬ — ЦЕНА */}
                <div className="lg:min-w-[240px] flex flex-col justify-start items-end text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Бюджет от
                  </div>

                  <div className="mt-3 whitespace-nowrap text-[clamp(28px,3.5vw,44px)] font-extrabold tracking-tight text-slate-900">
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
