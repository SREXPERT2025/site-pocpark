import Link from 'next/link';

const scenarios = [
  {
    number: '01',
    title: 'Гостевая заявка',
    description:
      'Арендатор создаёт временный доступ и получает публичную ссылку с QR-кодом.',
    href: '/demo/gostevaya-zayavka',
  },
  {
    number: '02',
    title: 'Оплата парковки гостей',
    description:
      'Арендатор находит посетителя и подтверждает оплату парковки за свой счёт.',
    href: '/demo/web-skidki',
  },
  {
    number: '03',
    title: 'Кабинет владельца',
    description:
      'Владелец изучает сводку, арендаторов, заявки, оплаты и журнал операций.',
    href: '/demo/vladelec-parkovki',
  },
] as const;

export default function DemoCommercialCallout({ className = '' }: { className?: string }) {
  return (
    <section
      aria-labelledby="demo-commercial-title"
      className={`my-12 overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-5 shadow-sm sm:p-8 ${className}`}
    >
      <div className="grid gap-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 sm:text-sm">
            Интерактивное демо ПО
          </p>
          <h2
            id="demo-commercial-title"
            className="mt-3 break-words text-2xl font-bold leading-tight text-slate-950 sm:text-3xl"
          >
            Посмотрите три роли одной парковочной системы
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            Пройдите связанный путь арендатора и владельца парковки на
            синтетических данных — без подключения к реальному оборудованию.
          </p>
          <Link
            href="/demo"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
          >
            Открыть все сценарии
          </Link>
        </div>

        <ol className="grid min-w-0 gap-3">
          {scenarios.map((scenario) => (
            <li key={scenario.href} className="min-w-0">
              <Link
                href={scenario.href}
                className="group grid min-h-24 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <span className="font-mono text-xs font-bold text-blue-700">
                  {scenario.number}
                </span>
                <span className="min-w-0">
                  <span className="block break-words font-bold text-slate-950">
                    {scenario.title}
                  </span>
                  <span className="mt-1 block break-words text-sm leading-6 text-slate-600">
                    {scenario.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-lg text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
