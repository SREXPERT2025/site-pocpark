export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-56 left-12 h-[520px] w-[520px] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-28 pb-20 lg:pt-40 lg:pb-28">
        <h1 className="text-balance text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Автоматизация парковок
          <span className="block bg-gradient-to-r from-blue-300 to-sky-400 bg-clip-text text-transparent">
            для коммерческой недвижимости
          </span>
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/80">
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2">Проектирование</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2">Монтаж</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2">Сервис</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2">Поддержка 24/7</span>
        </div>

        <p className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-white/75 sm:text-xl">
          Профессиональные решения под ключ: от схемы проезда и интеграций до сопровождения и развития.
        </p>
      </div>
    </section>
  );
}
