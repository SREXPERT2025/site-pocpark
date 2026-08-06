export default function Hero() {
  return (
    <section
      className="relative overflow-hidden text-white"
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
          poster="/hero-v2-20260805-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source
            src="/hero-v2-20260805.mp4"
            type="video/mp4"
            media="(min-width: 768px) and (prefers-reduced-motion: no-preference)"
          />
        </video>

        {/* Overlay: базовый затемняющий слой */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30" />

        {/* Градиентный слой слева направо */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex min-h-[calc(100svh-180px)] max-w-[1400px] items-center justify-center px-4 py-14 sm:min-h-[720px] sm:px-6 sm:py-20 md:h-[820px]">
        <div className="w-full max-w-[1000px] text-center animate-fadeInUp">

          {/* Малый верхний текст */}
          <div className="mb-4 text-[11px] leading-relaxed tracking-[0.22em] uppercase text-white/70 sm:mb-6 sm:text-xs sm:tracking-[0.3em]">
            РОСПАРК — парковочные системы под ключ
          </div>

          {/* H1 */}
          <h1 className="font-extrabold tracking-tight text-[42px] leading-[1.08] sm:text-[64px] md:text-[72px]">
            Парковка работает 24/7
            <br />
            система под контролем
          </h1>

          {/* Value line */}
          <div className="mt-5 text-[12px] leading-relaxed tracking-[0.18em] uppercase text-white/80 sm:mt-6 sm:text-[14px] sm:tracking-[0.25em]">
            Въезд · Оплата · Доступ · Отчётность
          </div>

          {/* Description */}
          <p className="mx-auto mt-6 max-w-[760px] text-[17px] leading-7 text-white/85 sm:mt-8 sm:text-[20px] sm:leading-[30px]">
            РОСПАРК автоматизирует въезд, доступ, оплату и контроль парковки под
            задачу вашего объекта. Оборудование, программное обеспечение,
            отчётность и поддержка работают как единая система.
          </p>

          {/* Trust metrics */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-center sm:mt-12 sm:gap-10">
            <div>
              <div className="text-[32px] font-bold text-white">
                350+
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/60">
                объектов
              </div>
            </div>

            <div>
              <div className="text-[32px] font-bold text-white">
                16 лет
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/60">
                опыта
              </div>
            </div>

            <div>
              <div className="text-[32px] font-bold text-white">
                50+
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-white/60">
                городов
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:mt-14 sm:flex-row sm:gap-5">
            <a
              href="/quiz?source=economy"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-10 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
            >
              Рассчитать проект
            </a>

            <a
              href="/keysy"
              className="rounded-lg border border-white/40 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Смотреть выполненные проекты
            </a>
          </div>

          <nav
            className="mt-6 flex flex-col items-center justify-center gap-3 text-sm font-semibold sm:flex-row sm:gap-6"
            aria-label="Выбор направления автоматизации парковки"
          >
            <a
              href="/resheniya"
              className="text-white/80 underline decoration-white/30 underline-offset-4 transition hover:text-white hover:decoration-white"
            >
              Подобрать парковочную систему
            </a>
            <a
              href="/oborudovanie"
              className="text-white/80 underline decoration-white/30 underline-offset-4 transition hover:text-white hover:decoration-white"
            >
              Посмотреть оборудование
            </a>
          </nav>

        </div>
      </div>
    </section>
  );
}
