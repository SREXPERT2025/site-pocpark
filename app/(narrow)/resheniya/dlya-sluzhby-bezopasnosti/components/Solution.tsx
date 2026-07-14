import Image from 'next/image';

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
              РОСПАРК — это единая система контроля доступа, событий и действий
              персонала. События проезда и ручные действия связываются с
              временными метками и учётными записями операторов.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    Фото- и событийная фиксация проездов
                  </h3>
                  <p className="text-slate-600">
                    Номер автомобиля, время, направление, камера, сценарий
                    допуска — всё сохраняется в журнале событий и доступно для
                    разбора инцидентов.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    Чёрные списки и правила блокировок
                  </h3>
                  <p className="text-slate-600">
                    Стоп-листы и правила доступа позволяют обрабатывать
                    автомобили с ограничениями, задолженностью или повторными
                    попытками проезда по регламенту объекта.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    Контроль действий персонала
                  </h3>
                  <p className="text-slate-600">
                    Ручные открытия, разблокировки и изменения правил могут
                    фиксироваться с указанием оператора, времени и рабочего
                    места.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    Ролевая модель доступа
                  </h3>
                  <p className="text-slate-600">
                    Разделение прав: СБ, охрана, администратор, инженер,
                    управляющий. Доступ настраивается в соответствии с
                    регламентом объекта.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Визуальный блок */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 min-h-[420px] flex flex-col justify-center">
            <div className="w-full overflow-hidden rounded-xl bg-white shadow-sm">
              <Image
                src="/images/solutions/security-events-dashboard.webp"
                alt="Скриншот журнала событий СБ"
                width={1200}
                height={800}
                className="block w-full h-auto object-cover"
              />
            </div>

            <p className="text-sm text-slate-400 mt-3 text-center">
              Проезды · Фото · Действия операторов · Фильтры
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
