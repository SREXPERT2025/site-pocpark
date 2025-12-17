import Link from 'next/link';

import Hero from './components/landing/Hero';
import RoleSelector from './components/landing/RoleSelector';
import PriceList from './components/landing/PriceList';

export default function Home() {
  return (
    <main className="min-h-screen">

      {/* 1. Герой-блок */}
      <Hero />

      {/* 2. Выбор роли */}
      <RoleSelector />

      {/* 3. Типы объектов */}
      <section className="py-20 border-t border-slate-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Решения под ваш тип объекта
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/resheniya/torgovye-centry"
              className="group relative h-64 rounded-xl overflow-hidden bg-gray-200"
            >
              <div className="absolute inset-0 bg-slate-900/50 group-hover:bg-slate-900/40 transition z-10" />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <h3 className="text-2xl font-bold text-white">
                  Торговые центры
                </h3>
              </div>
            </Link>

            <Link
              href="/resheniya/biznes-centry"
              className="group relative h-64 rounded-xl overflow-hidden bg-gray-200"
            >
              <div className="absolute inset-0 bg-slate-900/50 group-hover:bg-slate-900/40 transition z-10" />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <h3 className="text-2xl font-bold text-white">
                  Бизнес-центры
                </h3>
              </div>
            </Link>

            <Link
              href="/resheniya/zastroyschiki"
              className="group relative h-64 rounded-xl overflow-hidden bg-gray-200"
            >
              <div className="absolute inset-0 bg-slate-900/50 group-hover:bg-slate-900/40 transition z-10" />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <h3 className="text-2xl font-bold text-white">
                  Жилые комплексы
                </h3>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Цены */}
      <PriceList />

      {/* 5. CTA */}
      <section className="py-20 bg-blue-600 text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6">
            Готовы рассчитать проект?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Коммерческое предложение с расчётом и схемами за 1 рабочий день
          </p>
          <Link
            href="/contacts"
            className="inline-block px-10 py-5 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition"
          >
            Получить расчёт
          </Link>
        </div>
      </section>

    </main>
  );
}
