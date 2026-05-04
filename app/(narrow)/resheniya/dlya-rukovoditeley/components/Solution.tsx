export default function Solution() {
  return (
    <section className="overflow-x-hidden py-16 md:py-20 bg-white">
      <div className="container mx-auto max-w-full px-4">
        {/* Заголовок */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight break-words">
            Как РОСПАРК помогает управлять парковкой
          </h2>
          <p className="text-lg text-slate-600">
            Мы внедряем не просто оборудование, а комплексную систему управления
            доступом, оплатой и аналитикой для руководителей и управляющих
            компаний.
          </p>
        </div>

        {/* Контент */}
        <div className="grid min-w-0 max-w-full md:grid-cols-2 gap-10 md:gap-12 items-start">
          {/* Левая колонка — пункты */}
          <div className="space-y-10">
            {/* Пункт 1 */}
            <div className="flex gap-4 md:gap-5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                1
              </div>
              <div className="min-w-0">
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 break-words break-words leading-tight">
                  Полная финансовая прозрачность
                </h3>
                <p className="text-slate-600 break-words">
                  Все проезды, оплаты и события фиксируются автоматически.
                  Руководитель видит реальную выручку, загрузку парковки и
                  историю операций в едином интерфейсе — без ручных отчётов и
                  «человеческого фактора».
                </p>
              </div>
            </div>

            {/* Пункт 2 */}
            <div className="flex gap-4 md:gap-5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                2
              </div>
              <div className="min-w-0">
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 break-words break-words leading-tight">
                  Полная автоматизация 24/7
                </h3>
                <p className="text-slate-600 break-words">
                  Въезд, выезд и оплата работают без участия персонала. Система
                  самостоятельно управляет шлагбаумами, паркоматами и
                  распознаванием номеров, исключая простои и ошибки.
                </p>
              </div>
            </div>

            {/* Пункт 3 */}
            <div className="flex gap-4 md:gap-5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                3
              </div>
              <div className="min-w-0">
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-slate-900 break-words break-words leading-tight">
                  Управление и контроль с любого устройства
                </h3>
                <p className="text-slate-600 break-words">
                  Руководитель получает доступ к данным и настройкам из любой
                  точки: тарифы, отчёты, статистика, события и уведомления — всё
                  под контролем в режиме реального времени.
                </p>
              </div>
            </div>
          </div>

          {/* Правая колонка — визуальный блок */}
          <div className="w-full max-w-full min-w-0 overflow-hidden bg-slate-100 rounded-2xl p-3 sm:p-4 border border-slate-200 min-h-0 md:min-h-[420px] flex flex-col justify-center">
            <div className="w-full max-w-full overflow-hidden rounded-xl bg-white shadow-sm">
              <img
                src="/images/solutions/management-dashboard.jpg"
                alt="Панель управления РОСПАРК для руководителей"
                className="block h-auto w-full max-w-full object-cover"
              />
            </div>

            <p className="max-w-full break-words text-slate-500 text-sm mt-3 text-center">
              Панель управления РОСПАРК: выручка, загрузка, события, отчёты
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}