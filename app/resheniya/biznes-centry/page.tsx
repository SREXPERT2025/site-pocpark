import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Автоматизация парковки для бизнес-центров — РОСПАРК',
  description:
    'Решения РОСПАРК для бизнес-центров: контроль въезда, абонементы, гостевая парковка, интеграция с СКУД и 1С.',
}

export default function BiznesCentresPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* HERO */}
      <section className="pt-32 pb-16 bg-slate-50 border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl font-bold mb-4">
            Парковочные решения для бизнес-центров
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            Автоматизация парковки в бизнес-центрах: абонементы для арендаторов,
            гостевой доступ, контроль въезда и прозрачная отчетность.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl grid md:grid-cols-2 gap-12 items-center">

          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Типовые задачи бизнес-центров
            </h2>

            <ul className="space-y-3 text-slate-700 mb-6">
              <li>• Разделение парковки арендаторов и гостей</li>
              <li>• Контроль лимитов машин на компанию</li>
              <li>• Быстрый въезд без очередей</li>
              <li>• Интеграция с СКУД и пропусками</li>
              <li>• Отчёты для управляющей компании</li>
            </ul>

            <p className="text-slate-600">
              РОСПАРК внедряется как единая система управления въездом,
              абонементами и финансовыми потоками парковки БЦ.
            </p>
          </div>

          <div className="bg-slate-100 rounded-xl p-10 text-center text-slate-400 border">
            [ Здесь будет схема въезда БЦ или фото стойки ]
          </div>

        </div>

        <div className="container mx-auto px-4 max-w-6xl mt-16">
          <Link
            href="/resheniya"
            className="text-blue-600 font-medium hover:underline"
          >
            ← Все решения РОСПАРК
          </Link>
        </div>
      </section>

    </main>
  )
}
