export default function Reliability() {
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">
            Отказоустойчивость и аварийные режимы
          </h2>

          <p className="text-lg text-slate-300 mb-12 max-w-3xl">
            РОСПАРК проектируется как промышленная система,
            рассчитанная на круглосуточную эксплуатацию
            в реальных условиях — сбои связи, отключения питания,
            человеческий фактор.
          </p>

          <div className="grid md:grid-cols-2 gap-10">
            {/* СЕТЬ И СВЯЗЬ */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                🌐 Сеть и связь
              </h3>

              <ul className="space-y-4 text-slate-300">
                <li className="flex gap-3">
                  <span className="text-emerald-400">✓</span>
                  Работа контроллеров при отсутствии интернета
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400">✓</span>
                  Локальные сценарии открытия/закрытия проезда
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400">✓</span>
                  Буферизация событий и транзакций
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400">✓</span>
                  Автоматическая синхронизация при восстановлении связи
                </li>
              </ul>
            </div>

            {/* ПИТАНИЕ И ЖЕЛЕЗО */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                ⚡ Питание и оборудование
              </h3>

              <ul className="space-y-4 text-slate-300">
                <li className="flex gap-3">
                  <span className="text-emerald-400">✓</span>
                  Поддержка ИБП и резервного питания
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400">✓</span>
                  Автозапуск системы после восстановления питания
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400">✓</span>
                  Защита от зависаний и некорректных состояний
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-400">✓</span>
                  Диагностика и логирование ошибок
                </li>
              </ul>
            </div>
          </div>

          {/* АВАРИЙНЫЕ СЦЕНАРИИ */}
          <div className="mt-14 bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <h3 className="text-xl font-bold mb-6">
              Аварийные сценарии, которые мы учитываем
            </h3>

            <div className="grid sm:grid-cols-2 gap-6 text-slate-300">
              <div className="flex gap-3">
                <span className="text-yellow-400">⚠</span>
                Полный отказ сервера — контроллеры продолжают работу локально
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400">⚠</span>
                Сбой паркомата — альтернативные сценарии выезда
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400">⚠</span>
                Потеря связи с БД — запись событий во временное хранилище
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400">⚠</span>
                Ночной инцидент — удалённая диагностика без выезда
              </div>
            </div>
          </div>

          {/* ИНЖЕНЕРНЫЙ АКЦЕНТ */}
          <div className="mt-12 text-slate-400 text-sm max-w-3xl">
            * Все сценарии отрабатываются на этапе проектирования.
            Мы закладываем отказоустойчивость в архитектуру,
            а не «добавляем костыли» после запуска.
          </div>
        </div>
      </div>
    </section>
  );
}
