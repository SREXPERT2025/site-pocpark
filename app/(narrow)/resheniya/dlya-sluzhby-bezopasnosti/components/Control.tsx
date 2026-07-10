export default function Control() {
  return (
    <section id="control" className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">

        <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">
          Как осуществляется контроль проездов
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          {/* 1. ФИКСАЦИЯ */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-3xl mb-4 text-red-600">📷</div>
            <h3 className="text-base md:text-lg font-bold mb-3 leading-snug">
              Фиксация каждого события
            </h3>
            <p className="text-slate-600 mb-4">
              Каждый въезд и выезд автоматически фиксируется системой:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>госномер ТС</li>
              <li>дата и точное время</li>
              <li>фото/видео кадр</li>
              <li>точка проезда</li>
            </ul>
          </div>

          {/* 2. АРХИВ И ДОСТУП */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-3xl mb-4 text-red-600">🗄</div>
            <h3 className="text-base md:text-lg font-bold mb-3 leading-snug">
              Архив и разграничение доступа
            </h3>
            <p className="text-slate-600 mb-4">
              Все события сохраняются в журнале проездов с возможностью:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>поиска по номеру ТС</li>
              <li>фильтрации по дате и точке</li>
              <li>выгрузки отчетов</li>
              <li>разграничения прав доступа</li>
            </ul>
          </div>

          {/* 3. УПРАВЛЕНИЕ И РЕАКЦИЯ */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-3xl mb-4 text-red-600">🚨</div>
            <h3 className="text-base md:text-lg font-bold mb-3 leading-snug">
              Управление и реагирование
            </h3>
            <p className="text-slate-600 mb-4">
              Служба безопасности может управлять системой в реальном времени:
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>ручное открытие / блокировка</li>
              <li>чёрные и белые списки ТС</li>
              <li>реакция на инциденты</li>
              <li>журнал действий операторов</li>
            </ul>
          </div>

        </div>

      </div>
    </section>
  );
}
