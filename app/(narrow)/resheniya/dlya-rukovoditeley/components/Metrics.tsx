export default function Metrics() {
  return (
    <section className="overflow-x-hidden py-16 md:py-20 bg-slate-900 text-white">
      <div className="container mx-auto max-w-full px-4">

        {/* Заголовок */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-2xl md:text-4xl font-bold mb-4 leading-tight break-words">
            Как автоматизация влияет на экономику парковки
          </h2>
          <p className="text-lg text-slate-300">
            Автоматизация парковки помогает контролировать выручку, затраты и загрузку,
            снижает операционные издержки и повышает управляемость объекта.
          </p>
        </div>

        {/* Метрики */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Метрика 1 */}
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700 min-w-0">
            <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-3 break-words">
              Расчёт по объекту
            </div>
            <h3 className="font-bold text-lg mb-2 break-words">
              Контроль выручки и загрузки
            </h3>
            <p className="text-slate-400 text-sm">
              Эффект оценивается по текущей выручке, загрузке,
              тарифам и доле ручных операций.
            </p>
          </div>

          {/* Метрика 2 */}
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700 min-w-0">
            <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-3 break-words">
              Единый учёт
            </div>
            <h3 className="font-bold text-lg mb-2 break-words">
              Контроль оплат
            </h3>
            <p className="text-slate-400 text-sm">
              Въезды, выезды и платежи фиксируются системой.
              Проезд обрабатывается по настроенным правилам доступа и оплаты.
            </p>
          </div>

          {/* Метрика 3 */}
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700 min-w-0">
            <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-3 break-words">
              Автоматизация
            </div>
            <h3 className="font-bold text-lg mb-2 break-words">
              Затраты на персонал
            </h3>
            <p className="text-slate-400 text-sm">
              Объём постоянного ручного контроля зависит от сценариев,
              конфигурации оборудования и регламентов объекта.
            </p>
          </div>

          {/* Метрика 4 */}
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700 min-w-0">
            <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-3 break-words">
              24/7
            </div>
            <h3 className="font-bold text-lg mb-2 break-words">
              Круглосуточная работа
            </h3>
            <p className="text-slate-400 text-sm">
              Автоматические сценарии проезда и оплаты доступны круглосуточно,
              а спорные ситуации остаются под контролем ответственных сотрудников.
            </p>
          </div>

        </div>

        {/* Подстрочник */}
        <div className="mt-12 text-sm text-slate-400 max-w-3xl">
          * Фактический экономический эффект зависит от типа объекта,
          текущей организации парковки и выбранной конфигурации системы.
          Точный расчёт выполняется после обследования объекта.
        </div>

      </div>
    </section>
  );
}
