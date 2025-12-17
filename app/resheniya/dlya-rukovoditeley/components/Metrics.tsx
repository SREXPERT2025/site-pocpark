export default function Metrics() {
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="container mx-auto px-4">

        {/* Заголовок */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Экономический эффект от автоматизации
          </h2>
          <p className="text-lg text-slate-300">
            Автоматизация парковки напрямую влияет на чистый операционный доход (NOI),
            снижает операционные издержки и повышает управляемость объекта.
          </p>
        </div>

        {/* Метрики */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Метрика 1 */}
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <div className="text-4xl font-bold text-blue-500 mb-3">
              +15–30%
            </div>
            <h3 className="font-bold text-lg mb-2">
              Рост NOI объекта
            </h3>
            <p className="text-slate-400 text-sm">
              За счёт прозрачной выручки, устранения «серых схем»
              и оптимизации тарифов.
            </p>
          </div>

          {/* Метрика 2 */}
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <div className="text-4xl font-bold text-blue-500 mb-3">
              100%
            </div>
            <h3 className="font-bold text-lg mb-2">
              Контроль оплат
            </h3>
            <p className="text-slate-400 text-sm">
              Каждый въезд, выезд и платёж фиксируется системой.
              Проехать «мимо кассы» невозможно.
            </p>
          </div>

          {/* Метрика 3 */}
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <div className="text-4xl font-bold text-blue-500 mb-3">
              −0 ₽
            </div>
            <h3 className="font-bold text-lg mb-2">
              Затраты на персонал
            </h3>
            <p className="text-slate-400 text-sm">
              Отсутствие парковщиков, смен, больничных,
              инкассации и ручного контроля.
            </p>
          </div>

          {/* Метрика 4 */}
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <div className="text-4xl font-bold text-blue-500 mb-3">
              24/7
            </div>
            <h3 className="font-bold text-lg mb-2">
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
