"use client";

import AnimatedNumber from "./AnimatedNumber";

export default function Hero() {
  return (
    <section
      className="relative text-white"
      style={{
        width: "100vw",
        left: "50%",
        right: "50%",
        marginLeft: "-50vw",
        marginRight: "-50vw",
        position: "relative",
      }}
    >
      {/* Background video */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          className="h-full w-full object-cover scale-[1.02] animate-heroZoom"
          src="/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
        />

        {/* Overlay: базовый затемняющий слой */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30" />

        {/* Градиентный слой слева направо */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex h-[820px] max-w-[1400px] items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-[1000px] text-center animate-fadeInUp">

          {/* Малый верхний текст */}
          <div className="mb-6 text-xs tracking-[0.3em] uppercase text-white/70">
            РОСПАРК — ЦИФРОВАЯ ПЛАТФОРМА УПРАВЛЕНИЯ ПАРКОВКОЙ
          </div>

          {/* H1 */}
          <h1 className="font-extrabold tracking-tight text-[52px] leading-[1.1] sm:text-[64px] md:text-[72px]">
            Управляемая парковка
            <br />
            как бизнес-актив
          </h1>

          {/* Value line */}
          <div className="mt-6 text-[14px] tracking-[0.25em] uppercase text-white/80">
            Рост NOI · Контроль доступа · Прозрачная выручка
          </div>

          {/* Description */}
          <p className="mx-auto mt-8 max-w-[760px] text-[18px] leading-[30px] text-white/85 sm:text-[20px]">
            Мы превращаем парковку
            в управляемый финансовый инструмент
            с прозрачной экономикой и аналитикой в реальном времени.
          </p>

          {/* Trust metrics */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-10 text-center">
            <div>
              <div className="text-[32px] font-bold text-white">
                <AnimatedNumber value={350} suffix="+" />
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/60">
                объектов
              </div>
            </div>

            <div>
              <div className="text-[32px] font-bold text-white">
                <AnimatedNumber value={15} suffix="" /> лет
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/60">
                опыта
              </div>
            </div>

            <div>
              <div className="text-[32px] font-bold text-white">
                <AnimatedNumber value={50} suffix="+" />
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/60">
                городов
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-14 flex flex-col items-center justify-center gap-5 sm:flex-row">
            <a
              href="/quiz?source=economy"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-10 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
            >
              Рассчитать экономику объекта
            </a>

            <a
              href="/keysy"
              className="rounded-lg border border-white/40 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Смотреть проекты
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
