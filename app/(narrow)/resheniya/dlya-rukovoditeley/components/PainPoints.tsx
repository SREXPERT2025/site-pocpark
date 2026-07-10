export default function PainPoints() {
  return (
    <section className="overflow-x-hidden py-16 md:py-20 bg-slate-50">
      <div className="container mx-auto max-w-full px-4">

        {/* Заголовок */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight break-words">
            Какие проблемы парковки видит руководитель
          </h2>
          <p className="text-lg text-slate-600">
            Даже при хорошем потоке автомобилей парковка часто остаётся источником потерь,
            конфликтов и неконтролируемых расходов.
          </p>
        </div>

        {/* Карточки болей */}
        <div className="grid min-w-0 md:grid-cols-3 gap-6 md:gap-8">

          {/* Боль 1 */}
          <div className="bg-white max-w-full p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm min-w-0 overflow-hidden">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-base md:text-lg font-bold mb-3 text-slate-900 leading-snug break-words">
              Непрозрачная выручка
            </h3>
            <p className="text-slate-600 break-words">
              Невозможно точно понять, сколько автомобилей заехало,
              сколько оплатили и сколько денег реально поступило.
              Ручные операции и «серые» схемы снижают доход.
            </p>
          </div>

          {/* Боль 2 */}
          <div className="bg-white max-w-full p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm min-w-0 overflow-hidden">
            <div className="text-4xl mb-4">📉</div>
            <h3 className="text-base md:text-lg font-bold mb-3 text-slate-900 leading-snug break-words">
              Операционные потери
            </h3>
            <p className="text-slate-600 break-words">
              Зарплаты персонала, инкассация, расходные материалы,
              ошибки персонала и простои оборудования напрямую
              снижают контроль выручки, затрат и загрузки парковки.
            </p>
          </div>

          {/* Боль 3 */}
          <div className="bg-white max-w-full p-5 md:p-8 rounded-2xl border border-slate-200 shadow-sm min-w-0 overflow-hidden">
            <div className="text-4xl mb-4">😡</div>
            <h3 className="text-base md:text-lg font-bold mb-3 text-slate-900 leading-snug break-words">
              Недовольство арендаторов и клиентов
            </h3>
            <p className="text-slate-600 break-words">
              Очереди на выезде, сложные сценарии оплаты,
              неработающие карты и конфликтные ситуации
              напрямую бьют по репутации объекта.
            </p>
          </div>

        </div>

        {/* Усиливающий текст */}
        <div className="max-w-4xl mx-auto mt-14 text-center">
          <p className="text-lg text-slate-700">
            В результате парковка перестаёт быть управляемым активом
            и превращается в постоянную головную боль для управляющей компании.
          </p>
        </div>

      </div>
    </section>
  );
}
