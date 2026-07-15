export default function TechStack() {
  return (
    <section
      id="integration"
      className="overflow-hidden bg-slate-50 py-12 border-t border-slate-200 sm:py-16 md:py-20"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl min-w-0">
          <h2 className="mb-6 break-words text-3xl font-bold leading-tight text-slate-900">
            Техническая архитектура решения
          </h2>

          <p className="mb-10 max-w-3xl break-words text-base leading-7 text-slate-600 sm:mb-12 sm:text-lg">
            Система РОСПАРК строится по модульному принципу и объединяет
            совместимые компоненты. Интерфейсы и протоколы подбираются
            под выбранное оборудование и требования интеграции.
          </p>

          <div className="grid min-w-0 gap-5 md:grid-cols-2 md:gap-10">
            {/* ЖЕЛЕЗО */}
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 md:p-8">
              <h3 className="mb-6 flex min-w-0 items-start gap-3 break-words text-[22px] font-bold leading-tight">
                🔩 Аппаратный уровень
              </h3>

              <ul className="min-w-0 space-y-4 text-slate-700">
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  Контроллеры въезда/выезда (сухие контакты, RS-485)
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  IP-камеры (распознавание номеров, фотофиксация)
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  Паркоматы и платежные терминалы
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  ИБП и автономное питание КПП
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  Индукционные петли, датчики, периферия
                </li>
              </ul>
            </div>

            {/* ПО И ИНТЕГРАЦИИ */}
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 md:p-8">
              <h3 className="mb-6 flex min-w-0 items-start gap-3 break-words text-[22px] font-bold leading-tight">
                🧠 Программный уровень
              </h3>

              <ul className="min-w-0 space-y-4 text-slate-700">
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  Сервер управления на объекте или в облаке
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  Панель администратора через браузер
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  Программный интерфейс для интеграции со СКУД, расчётными и учётными системами
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  Журналы, события, история проездов
                </li>
                <li className="flex min-w-0 items-start gap-3">
                  <span className="shrink-0 font-bold text-emerald-600">•</span>
                  Плановые обновления по согласованному регламенту
                </li>
              </ul>
            </div>
          </div>

          {/* отказоустойчивость */}
          <div className="mt-10 w-full max-w-full overflow-hidden rounded-2xl bg-slate-900 p-5 text-white sm:mt-14 sm:p-8">
            <h3 className="mb-5 max-w-full break-words text-[30px] font-bold leading-[1.16] sm:text-2xl">
              Отказоустойчивость и автономность
            </h3>

            <ul className="grid min-w-0 gap-4 break-words text-base leading-relaxed text-slate-300 sm:grid-cols-2 sm:text-lg">
              <li className="flex min-w-0 items-start gap-3">
                <span className="shrink-0 text-green-400">✓</span>
                Локальный режим, если предусмотрен проектом
              </li>
              <li className="flex min-w-0 items-start gap-3">
                <span className="shrink-0 text-green-400">✓</span>
                Восстановление и синхронизация связи
              </li>
              <li className="flex min-w-0 items-start gap-3">
                <span className="shrink-0 text-green-400">✓</span>
                Локальное хранение в выбранной конфигурации
              </li>
              <li className="flex min-w-0 items-start gap-3">
                <span className="shrink-0 text-green-400">✓</span>
                Резервирование по требованиям объекта
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
