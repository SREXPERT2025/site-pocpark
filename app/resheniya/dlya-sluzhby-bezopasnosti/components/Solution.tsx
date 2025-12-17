export default function Solution() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Текст */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Централизованный контроль въезда и событий
            </h2>

            <p className="text-lg text-slate-600 mb-8">
              РОСПАРК — это единая система контроля доступа, событий и действий персонала.
              Каждый проезд фиксируется, каждое действие имеет автора и временную метку.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    Фото- и событийная фиксация каждого проезда
                  </h3>
                  <p className="text-slate-600">
                    Номер автомобиля, время, направление, камера, сценарий допуска —
                    всё сохраняется в журнале событий и доступно для разбора инцидентов.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    Чёрные списки и правила блокировок
                  </h3>
                  <p className="text-slate-600">
                    Автоматическая блокировка нарушителей, автомобилей с долгами,
                    несанкционированных номеров и попыток повторного проезда.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    Контроль действий персонала
                  </h3>
                  <p className="text-slate-600">
                    Любое ручное вмешательство (открытие, разблокировка, изменение правил)
                    фиксируется: кто, когда и с какого рабочего места.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    Ролевая модель доступа
                  </h3>
                  <p className="text-slate-600">
                    Разделение прав: СБ, охрана, администратор, инженер, управляющий.
                    Каждый видит только то, что положено по регламенту.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Визуальный плейсхолдер */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-8 min-h-[420px] flex items-center justify-center text-center">
            <div>
              <p className="text-slate-400 font-medium">
                [Скриншот журнала событий СБ]
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Проезды · Фото · Действия операторов · Фильтры
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
