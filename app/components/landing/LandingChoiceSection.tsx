import LandingEntryLink from '@/app/components/landing/LandingEntryLink';

export default function LandingChoiceSection() {
  return (
    <section className="min-w-0 px-3 py-10 sm:px-6 sm:py-14" aria-labelledby="landing-choice-title">
      <div className="mx-auto min-w-0 max-w-[1088px] overflow-hidden rounded-3xl bg-slate-950 px-4 py-7 text-white shadow-xl sm:px-9 sm:py-10 lg:px-12">
        <div className="min-w-0 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-300">
            С чего начать
          </p>
          <h2 id="landing-choice-title" className="mt-3 text-[clamp(1.75rem,8vw,2.25rem)] font-extrabold leading-tight tracking-tight sm:text-4xl">
            Выберите удобный способ разобраться с парковкой
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
            Не обязательно знать названия оборудования. Начните с конкретной проблемы или подберите всю систему для объекта.
          </p>
        </div>

        <div className="mt-7 grid min-w-0 gap-4 md:grid-cols-2">
          <LandingEntryLink
            href="/parkovka"
            sourceSection="home_start"
            targetVariant="parkovka"
            className="group flex min-w-0 flex-col rounded-2xl border border-white/15 bg-white p-5 text-slate-950 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Есть конкретная задача</p>
            <h3 className="mt-3 break-words text-[1.35rem] font-bold leading-tight sm:text-2xl">Организовать парковку</h3>
            <p className="mt-3 leading-7 text-slate-600">
              Очереди, ручные пропуска, въезд по госномеру, оплата или замена старой системы.
            </p>
            <span className="mt-6 inline-flex break-words font-semibold text-blue-700 md:mt-auto md:pt-6">Посмотреть простой сценарий →</span>
          </LandingEntryLink>

          <LandingEntryLink
            href="/parkovka-pod-klyuch"
            sourceSection="home_start"
            targetVariant="puzzle2"
            className="group flex min-w-0 flex-col rounded-2xl border border-blue-400/35 bg-blue-600 p-5 text-white transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100">Нужна вся система</p>
            <h3 className="mt-3 break-words text-[1.35rem] font-bold leading-tight sm:text-2xl">Парковка под ключ</h3>
            <p className="mt-3 leading-7 text-blue-50">
              Подберём въезд, оплату, оборудование, программное обеспечение, монтаж и поддержку.
            </p>
            <span className="mt-6 inline-flex break-words font-semibold text-white md:mt-auto md:pt-6">Подобрать систему →</span>
          </LandingEntryLink>
        </div>
      </div>
    </section>
  );
}
