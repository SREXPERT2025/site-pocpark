import Link from "next/link";

export const metadata = {
  title: "Решения по автоматизации парковки | РОСПАРК",
  description:
    "Решения РОСПАРК для руководителей, инженеров и служб безопасности. Управление доходами, надежная автоматика, контроль доступа.",
};

export default function SolutionsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* HERO */}
      <section className="pt-28 pb-20 text-center">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Решения РОСПАРК
          </h1>
          <p className="text-lg text-slate-600">
            Автоматизация парковки под задачи конкретной роли.
            Выберите, с какой стороны вы смотрите на объект.
          </p>
        </div>
      </section>

      {/* CARDS */}
      <section className="pb-28">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">

          {/* Руководители */}
          <Link
            href="/resheniya/dlya-rukovoditeley"
            className="group bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-xl transition"
          >
            <div className="text-4xl mb-4">👔</div>
            <h2 className="text-2xl font-bold mb-3 group-hover:text-blue-600">
              Для руководителей
            </h2>
            <p className="text-slate-600 mb-4">
              Доход, контроль, прозрачная выручка и рост NOI.
            </p>
            <span className="text-blue-600 font-medium">
              Перейти →
            </span>
          </Link>

          {/* Инженеры */}
          <Link
            href="/resheniya/dlya-inzhenerov"
            className="group bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-xl transition"
          >
            <div className="text-4xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold mb-3 group-hover:text-emerald-600">
              Для инженеров
            </h2>
            <p className="text-slate-600 mb-4">
              Контроллеры, схемы, API, надежность 24/7.
            </p>
            <span className="text-emerald-600 font-medium">
              Перейти →
            </span>
          </Link>

          {/* Служба безопасности */}
          <Link
            href="/resheniya/dlya-sluzhby-bezopasnosti"
            className="group bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-xl transition"
          >
            <div className="text-4xl mb-4">🛡</div>
            <h2 className="text-2xl font-bold mb-3 group-hover:text-red-600">
              Для службы безопасности
            </h2>
            <p className="text-slate-600 mb-4">
              Контроль въезда, архив событий, черные списки.
            </p>
            <span className="text-red-600 font-medium">
              Перейти →
            </span>
          </Link>

        </div>
      </section>
    </main>
  );
}
