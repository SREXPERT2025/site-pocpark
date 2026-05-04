export default function Metrics() {
  return (
    <section className="overflow-x-hidden py-16 md:py-20 bg-slate-900 text-white">
      <div className="container mx-auto max-w-full px-4">

        {/* Заголовок */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-2xl md:text-4xl font-bold mb-4 leading-tight break-words">
            Экономический эффект от автоматизации
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
              +15–30%
            </div>
            <h3 className="font-bold text-lg mb-2 break-words">
              Контроль выручки и загрузки
            </h3>
            <p className="text-slate-400 text-sm">
              За счёт прозрачной выручки, устранения «серых схем»
              и оптимизации тарифов.
            </p>
          </div>

          {/* Метрика 2 */}
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700 min-w-0">
            <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-3 break-words">
              100%
            </div>
            <h3 className="font-bold text-lg mb-2 break-words">
              Контроль оплат
            </h3>
            <p className="text-slate-400 text-sm">
              Каждый въезд, выезд и платёж фиксируется системой.
              Проехать «мимо кассы» невозможно.
            </p>
          </div>

          {/* Метрика 3 */}
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700 min-w-0">
            <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-3 break-words">
              −0 ₽
            </div>
            <h3 className="font-bold text-lg mb-2 break-words">
              Затраты на персонал
            </h3>
            <p className="text-slate-400 text-sm">
              Отсутствие парковщиков, смен, больничных,
              инкассации и ручного контроля.
            </p>
          </div>

          {/* Метрика 4 */}
          <div className="bg-slate-800 rounded-2xl p-6 md:p-8 border border-slate-700 min-w-0">
            <div className="text-3xl md:text-4xl font-bold text-blue-500 mb-3 break-words">
              24/7
            </div>
            <h3 className="font-bold text-lg mb-2 break-words">
              Работа без простоев
            </h3>
            <p className="text-slate-400 text-sm">
              Система работает круглосуточно, без выходных,
              отпусков и человеческого фактора.
            </p>
          </div>

        </div>

        {/* Подстрочник */}
        <div className="mt-12 text-sm text-slate-400 max-w-3xl">
          * Фактический экономический эффект зависит от типа объекта,
          текущей организации парковки и выбранной конфигурации системы.
          Точный расчёт выполняется в рамках аудита.
        </div>

      </div>
    </section>
  );
}
