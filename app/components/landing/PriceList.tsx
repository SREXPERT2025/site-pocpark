const packages = [
  {
    title: "Ниппельный выезд",
    description: "Для зон погрузки и служебных проездов",
    features: [
      "Контроллер + логика безопасности",
      "Автоматический режим «Ниппель»",
      "Монтаж и пусконаладка",
    ],
    priceFrom: "245 000 ₽",
  },
  {
    title: "Въезд по госномеру",
    description: "Камеры LPR + стойки + ПО",
    features: [
      "LPR-камера + подсветка",
      "Стойка въезда/выезда",
      "ПО распознавания и настройки",
    ],
    priceFrom: "1 350 000 ₽",
  },
  {
    title: "Автоматическая парковка",
    description: "Безбилетная система, полная автоматизация",
    features: [
      "Сценарии въезда/выезда",
      "Гостевые/разовые клиенты",
      "Отчёты и админ-панель",
    ],
    priceFrom: "2 000 000 ₽",
  },
  {
    title: "Парковочная система PRO",
    description: "Контроль гостей, сотрудников, оплата",
    features: [
      "Абонементы и роли доступа",
      "Онлайн-оплата и уведомления",
      "Интеграции и API",
    ],
    priceFrom: "2 500 000 ₽",
  },
];

export default function PriceList() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Примерные комплектации и стоимость
          </h2>
          <p className="mt-4 text-[20px] text-slate-600">
            Ниже — ориентиры для быстрой оценки. Финальная конфигурация зависит от задач, количества въездов и интеграций.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {packages.map((pkg) => (
            <div
              key={pkg.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="md:w-[280px]">
                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                    {pkg.title}
                  </h3>
                  <p className="mt-2 text-slate-600">{pkg.description}</p>
                </div>

                <div className="md:flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Что входит
                  </div>
                  <ul className="mt-3 grid gap-y-2 gap-x-8 sm:grid-cols-2">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-slate-700">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="md:w-[220px] md:text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Стоимость от
                  </div>
                  <div className="mt-2 text-4xl font-extrabold tracking-tight text-blue-600">
                    {pkg.priceFrom}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          * Стоимость может меняться в зависимости от комплектации и курса валют
        </p>
      </div>
    </section>
  );
}
