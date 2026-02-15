import Link from 'next/link';

export default function ObjectTypes() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">

        {/* Заголовок */}
        <div className="max-w-3xl mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Решения под ваш тип недвижимости
          </h2>
          <p className="text-lg text-slate-600">
            Мы учитываем специфику каждого объекта — от торговых центров
            с высоким трафиком до закрытых жилых комплексов.
          </p>
        </div>

        {/* Карточки */}
        <div className="grid md:grid-cols-3 gap-8">

          {/* ТЦ */}
          <Link
            href="/resheniya/torgovye-centry"
            className="group block p-8 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-4">🏬</div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-blue-600">
              Торговые центры
            </h3>
            <p className="text-slate-600 mb-4">
              Управление высоким потоком автомобилей, бесплатные периоды,
              валидация чеков, рост посещаемости арендаторов.
            </p>
            <span className="font-medium text-blue-600">
              Подробнее →
            </span>
          </Link>

          {/* БЦ */}
          <Link
            href="/resheniya/biznes-centry"
            className="group block p-8 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-4">🏢</div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-blue-600">
              Бизнес-центры
            </h3>
            <p className="text-slate-600 mb-4">
              Абонементы для арендаторов, гостевые пропуска,
              контроль загрузки и удобство для резидентов.
            </p>
            <span className="font-medium text-blue-600">
              Подробнее →
            </span>
          </Link>

          {/* ЖК */}
          <Link
            href="/resheniya/zastroyschiki"
            className="group block p-8 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-4">🏘️</div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-blue-600">
              Жилые комплексы
            </h3>
            <p className="text-slate-600 mb-4">
              Закрытая территория, продажа и аренда машиномест,
              мобильный доступ для жителей и гостей.
            </p>
            <span className="font-medium text-blue-600">
              Подробнее →
            </span>
          </Link>

        </div>

      </div>
    </section>
  );
}
