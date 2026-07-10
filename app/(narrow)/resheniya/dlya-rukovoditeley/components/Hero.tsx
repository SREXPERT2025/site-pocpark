import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative pt-24 pb-14 md:pt-32 md:pb-20 bg-slate-900 text-white overflow-x-hidden">
      {/* Фон */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-slate-900" />

      <div className="relative z-10 container mx-auto max-w-full px-4">
        <div className="max-w-4xl min-w-0">
          
          {/* Бейдж */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full 
                          bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm font-medium">
            👔 Для руководителей и управляющих
          </div>

          {/* H1 — строго один на странице */}
          <h1 className="text-[clamp(2rem,9vw,3.75rem)] md:text-6xl font-bold leading-tight mb-6 break-words hyphens-auto [overflow-wrap:anywhere]">
            Как сделать парковку управляемой: <br />
            <span className="text-blue-500">
              доступ, оплата, отчётность и контроль загрузки
            </span>
          </h1>

          {/* Подзаголовок */}
          <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-2xl break-words">
            РОСПАРК помогает превратить парковку из источника потерь и конфликтов
            в прозрачный бизнес-процесс с контролем выручки и загрузки в реальном времени.
          </p>

          {/* Ключевые выгоды */}
          <ul className="grid sm:grid-cols-2 gap-4 mb-10 text-slate-200">
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              Прозрачная выручка и отчёты
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              Меньше ручных операций
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              Решения для ТЦ, БЦ и жилых комплексов
            </li>
            <li className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              Опыт автоматизации с 2010 года
            </li>
          </ul>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="#quiz"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 
                         rounded-lg font-bold transition-colors text-center"
            >
              Рассчитать проект
            </Link>

            <Link
              href="/keysy"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 
                         border border-slate-700 rounded-lg font-medium 
                         transition-colors text-center"
            >
              Смотреть выполненные проекты
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
