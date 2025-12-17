export default function Solution() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">

        {/* Заголовок */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Как РОСПАРК превращает парковку в управляемый актив
          </h2>
          <p className="text-lg text-slate-600">
            Мы внедряем не просто оборудование, а комплексную систему управления
            доступом, оплатой и аналитикой для руководителей и управляющих компаний.
          </p>
        </div>

        {/* Контент */}
        <div className="grid md:grid-cols-2 gap-12 items-start">

          {/* Левая колонка — пункты */}
          <div className="space-y-10">

            {/* Пункт 1 */}
            <div className="flex gap-5">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">
                  Полная финансовая прозрачность
                </h3>
                <p className="text-slate-600">
                  Все проезды, оплаты и события фиксируются автоматически.
                  Руководитель видит реальную выручку, загрузку парковки
                  и историю операций в едином интерфейсе — без ручных отчётов
                  и «человеческого фактора».
                </p>
              </div>
            </div>

            {/* Пункт 2 */}
            <div className="flex gap-5">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">
                  Полная автоматизация 24/7
                </h3>
                <p className="text-slate-600">
                  Въезд, выезд и оплата работают без участия персонала.
                  Система самостоятельно управляет шлагбаумами,
                  паркоматами и распознаванием номеров,
                  исключая простои и ошибки.
                </p>
              </div>
            </div>

            {/* Пункт 3 */}
            <div className="flex gap-5">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">
                  Управление и контроль с любого устройства
                </h3>
                <p className="text-slate-600">
                  Руководитель получает доступ к данным и настройкам
                  из любой точки: тарифы, отчёты, статистика,
                  события и уведомления — всё под контролем в режиме реального времени.
                </p>
              </div>
            </div>

          </div>

          {/* Правая колонка — визуальный блок */}
          <div className="bg-slate-100 rounded-2xl p-10 border border-slate-200 min-h-[420px] flex flex-col justify-center text-center">
            <p className="text-slate-400 font-medium mb-2">
              [Здесь будет визуализация]
            </p>
            <p className="text-slate-500 text-sm">
              Дашборд РОСПАРК: выручка, загрузка, события, отчёты
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
