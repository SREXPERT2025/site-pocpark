export default function PainPoints() {
  return (
    <section className="min-w-0 overflow-hidden bg-slate-50 py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="mb-4 break-words text-3xl font-bold leading-tight text-slate-900">
            Типовые риски для службы безопасности на парковке
          </h2>
          <p className="break-words text-base leading-7 text-slate-600 sm:text-lg">
            Парковка — это точка контроля доступа и источник инцидентов: конфликтов, нарушений,
            «проездов по звонку», потерь доказательств и размывания ответственности.
          </p>
        </div>

        <div className="grid min-w-0 gap-5 md:grid-cols-3 md:gap-8">
          {/* 1 */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 md:p-8">
            <div className="mb-4 text-3xl sm:text-4xl">🛑</div>
            <h3 className="mb-3 break-words text-[22px] font-bold leading-tight text-slate-900">
              Нет управляемого контроля доступа
            </h3>
            <p className="break-words text-slate-600">
              Проезды по знакомству, ручные решения охраны, отсутствие единого сценария блокировок и
              правил допуска для гостей, арендаторов и служб.
            </p>
          </div>

          {/* 2 */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 md:p-8">
            <div className="mb-4 text-3xl sm:text-4xl">📸</div>
            <h3 className="mb-3 break-words text-[22px] font-bold leading-tight text-slate-900">
              Слабая доказательная база по инцидентам
            </h3>
            <p className="break-words text-slate-600">
              Нет связки “проезд → событие → фото/номер → операторское действие”.
              Сложно доказать факт нарушения, восстановить хронологию и ответственных.
            </p>
          </div>

          {/* 3 */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 md:p-8">
            <div className="mb-4 text-3xl sm:text-4xl">👤</div>
            <h3 className="mb-3 break-words text-[22px] font-bold leading-tight text-slate-900">
              Человеческий фактор и серые сценарии
            </h3>
            <p className="break-words text-slate-600">
              Ручное управление шлагбаумом, устные разрешения, отсутствие прозрачного журнала действий —
              всё это рождает уязвимости и конфликтные ситуации.
            </p>
          </div>

          {/* 4 */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 md:p-8">
            <div className="mb-4 text-3xl sm:text-4xl">⏱️</div>
            <h3 className="mb-3 break-words text-[22px] font-bold leading-tight text-slate-900">
              Нет быстрых реакций на нарушителей
            </h3>
            <p className="break-words text-slate-600">
              Нет чёрных списков, правил по долгам и нарушениям, автоматической блокировки и
              сигналов СБ при повторных попытках въезда.
            </p>
          </div>

          {/* 5 */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 md:p-8">
            <div className="mb-4 text-3xl sm:text-4xl">📂</div>
            <h3 className="mb-3 break-words text-[22px] font-bold leading-tight text-slate-900">
              Архив событий и доступы не стандартизированы
            </h3>
            <p className="break-words text-slate-600">
              Трудно понять, кто и что просматривал или изменял. Нет ролевой модели: СБ, охрана, администратор,
              инженер, управляющий — все работают в одной учётной записи.
            </p>
          </div>

          {/* 6 */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 md:p-8">
            <div className="mb-4 text-3xl sm:text-4xl">🧩</div>
            <h3 className="mb-3 break-words text-[22px] font-bold leading-tight text-slate-900">
              Разрозненные системы на объекте
            </h3>
            <p className="break-words text-slate-600">
              Парковка отдельно, СКУД отдельно, видеонаблюдение отдельно.
              Нет единой картины: события не связываются между собой, расследования занимают время.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
