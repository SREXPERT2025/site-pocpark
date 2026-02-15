import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 bg-slate-900 text-white overflow-hidden">
      {/* фон */}
      <div className="absolute inset-0 bg-blue-900/20" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          <div className="inline-block mb-6 px-4 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm font-medium">
            ⚙️ Решения для инженеров и служб эксплуатации
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Автоматизация парковки
            <br />
            <span className="text-blue-500">
              без сюрпризов в эксплуатации
            </span>
          </h1>

          <p className="text-xl text-slate-300 mb-10 max-w-2xl">
            Промышленное оборудование, понятная логика работы и
            готовность к интеграциям. Мы проектируем системы, которые
            легко смонтировать, обслуживать и масштабировать.
          </p>

          {/* технические триггеры */}
          <ul className="grid sm:grid-cols-2 gap-4 mb-12 text-slate-300">
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              RS-485 / Ethernet / сухие контакты
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              API и интеграции с внешними системами
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              Работа без интернета (offline-режим)
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              Документация, схемы, техподдержка
            </li>
          </ul>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="#integration"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors text-center"
            >
              Посмотреть интеграции
            </Link>

            <Link
              href="/contacts"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-colors text-center"
            >
              Запросить тех. консультацию
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
