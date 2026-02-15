import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 bg-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-red-900/20" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">

          <div className="inline-block mb-6 px-4 py-1 rounded-full bg-red-600/20 border border-red-500/30 text-red-300 text-sm font-medium">
            🛡 Решения для службы безопасности
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Полный контроль въезда и выезда
            <br />
            <span className="text-red-400">
              без человеческого фактора
            </span>
          </h1>

          <p className="text-xl text-slate-300 mb-8 max-w-3xl">
            Система фиксирует каждый проезд, хранит фото- и видеоархив,
            блокирует нарушителей и работает даже при отключении сети.
          </p>

          <ul className="grid sm:grid-cols-2 gap-4 mb-10 text-slate-300">
            <li className="flex items-center gap-3">
              <span className="text-red-400">■</span>
              Фотофиксация каждого въезда и выезда
            </li>
            <li className="flex items-center gap-3">
              <span className="text-red-400">■</span>
              Архив событий и журнал проездов
            </li>
            <li className="flex items-center gap-3">
              <span className="text-red-400">■</span>
              Чёрные списки и ручные блокировки
            </li>
            <li className="flex items-center gap-3">
              <span className="text-red-400">■</span>
              Работа без интернета и при ЧС
            </li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="#control"
              className="px-8 py-4 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-colors text-center"
            >
              Как осуществляется контроль
            </Link>

            <Link
              href="/contacts"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-colors text-center"
            >
              Задать вопрос СБ
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
