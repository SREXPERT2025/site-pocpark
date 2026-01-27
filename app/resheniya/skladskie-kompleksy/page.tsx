import Link from "next/link";

export default function WarehouseSolutionsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold">Решения для складских комплексов</h1>
        <p className="text-text-muted max-w-3xl">
          Контроль проезда для персонала, подрядчиков и грузового транспорта: без очередей,
          с прозрачными правилами доступа и полноценной аналитикой по событиям.
        </p>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border-primary bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold">Доступ для персонала и арендаторов</h2>
          <p className="mt-2 text-sm text-text-muted">
            RFID-карты, ГРНЗ, QR, BLE. Белые/черные списки, временные допуски,
            сценарии по сменам и зонам.
          </p>
        </div>

        <div className="rounded-2xl border border-border-primary bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold">Гостевые и разовые проезды</h2>
          <p className="mt-2 text-sm text-text-muted">
            Пропуска по номеру, QR-коды для водителей, интеграция с заявками,
            автоматическая фиксация въезда/выезда.
          </p>
        </div>

        <div className="rounded-2xl border border-border-primary bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold">Контроль грузового транспорта</h2>
          <p className="mt-2 text-sm text-text-muted">
            Права на проезд по маршрутам и временным окнам, учёт посещений,
            события по шлагбаумам, камерам и контроллерам.
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-border-primary bg-bg-secondary p-6">
        <h2 className="text-xl font-semibold">Что вы получаете</h2>
        <ul className="mt-4 grid gap-3 text-sm text-text-muted md:grid-cols-2">
          <li>Единые правила доступа для всех категорий пользователей</li>
          <li>Снижение ручных операций охраны и меньше конфликтов на КПП</li>
          <li>Журналы событий и отчёты для службы безопасности и управляющей компании</li>
          <li>Интеграции с внутренними системами через API и сценарии</li>
        </ul>
      </section>

      <div className="mt-10">
        <Link className="text-accent hover:opacity-80" href="/vozmozhnosti">
          Перейти в раздел возможностей системы →
        </Link>
      </div>
    </main>
  );
}
