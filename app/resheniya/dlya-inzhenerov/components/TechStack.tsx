export default function TechStack() {
  return (
    <section
      id="integration"
      className="py-20 bg-slate-50 border-t border-slate-200"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Техническая архитектура системы
          </h2>

          <p className="text-lg text-slate-600 mb-12 max-w-3xl">
            Система РОСПАРК строится по модульному принципу и
            не зависит от конкретного производителя оборудования.
            Все компоненты используют стандартные промышленные интерфейсы.
          </p>

          <div className="grid md:grid-cols-2 gap-10">
            {/* ЖЕЛЕЗО */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                🔩 Аппаратный уровень
              </h3>

              <ul className="space-y-4 text-slate-700">
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Контроллеры въезда/выезда (сухие контакты, RS-485)
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  IP-камеры (распознавание номеров, фотофиксация)
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Паркоматы и платежные терминалы
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  ИБП и автономное питание КПП
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Индукционные петли, датчики, периферия
                </li>
              </ul>
            </div>

            {/* ПО И ИНТЕГРАЦИИ */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                🧠 Программный уровень
              </h3>

              <ul className="space-y-4 text-slate-700">
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Сервер управления (локальный или облачный)
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Web-интерфейс администратора
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  REST API для интеграции с СКУД, биллингом, ERP
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Логи, события, история проездов
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Обновления без остановки системы
                </li>
              </ul>
            </div>
          </div>

          {/* отказоустойчивость */}
          <div className="mt-14 bg-slate-900 text-white rounded-2xl p-8">
            <h3 className="text-xl font-bold mb-4">
              Отказоустойчивость и автономность
            </h3>

            <ul className="grid sm:grid-cols-2 gap-4 text-slate-300">
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                Работа при отсутствии интернета
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                Автоматическое восстановление связи
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                Локальное хранение данных
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                Резервирование питания и каналов связи
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
