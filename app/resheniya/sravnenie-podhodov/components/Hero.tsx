import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative pt-28 pb-16 bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/15 via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-sm text-slate-200">
            <span className="opacity-90">⚖️</span>
            <span>Решения → Сравнение подходов</span>
          </div>

          <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-tight">
            Сравнение подходов к
            <span className="text-blue-400"> автоматизации парковки</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl">
            Аренда с разделением дохода, “коробка” с отдельным монтажом и система под ключ от производителя.
            Разложили по критериям: деньги, контроль, риски, поддержка и стоимость владения.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href="#table"
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors font-semibold text-center"
            >
              Смотреть сравнение
            </Link>

            <Link
              href="/resheniya/dlya-rukovoditeley"
              className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 transition-colors font-medium text-center"
            >
              Для руководителей
            </Link>
          </div>

          <ul className="mt-10 grid sm:grid-cols-2 gap-3 text-slate-300">
            <li className="flex gap-3">
              <span className="text-emerald-400">✓</span>
              Фокус на бизнес-логике, не “шлагбаумах”
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400">✓</span>
              Поясняем “цена” vs “стоимость владения”
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400">✓</span>
              Помогаем выбрать под ТЦ/БЦ/ЖК
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400">✓</span>
              Чек-лист для принятия решения
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
