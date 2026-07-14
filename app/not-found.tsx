import Link from 'next/link';

const primaryLinks = [
  {
    href: '/resheniya/dlya-rukovoditeley',
    title: 'Решения',
    text: 'Подбор сценария по роли или типу объекта.',
  },
  {
    href: '/vozmozhnosti',
    title: 'Возможности',
    text: 'Оплата, распознавание, доступы и типы клиентов.',
  },
  {
    href: '/oborudovanie',
    title: 'Оборудование',
    text: 'Шлагбаумы, терминалы, камеры и контроллеры.',
  },
  {
    href: '/keysy',
    title: 'Проекты',
    text: 'Примеры внедрений и объектов.',
  },
];

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[1088px] px-4 py-16 sm:px-6 lg:px-8"
    >
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Страница не найдена
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          Такой страницы нет или ссылка устарела
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700">
          Можно вернуться к основным разделам сайта РОСПАРК или сразу отправить
          вводные по объекту для расчета проекта.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/quiz"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Рассчитать проект
          </Link>
          <Link
            href="/contacts"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          >
            Связаться
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {primaryLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/40"
          >
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
