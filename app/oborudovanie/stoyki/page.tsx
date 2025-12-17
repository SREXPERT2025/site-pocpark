import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Въездные и выездные стойки для парковок — РОСПАРК',
  description:
    'Въездные и выездные стойки РОСПАРК для автоматических парковок: интеграция с шлагбаумами, камерами и контроллерами.',
}

export default function StoykiPage() {
  return (
    <main className="min-h-screen bg-white">
      
      {/* HERO */}
      <section className="pt-32 pb-16 bg-slate-50 border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl font-bold mb-4">
            Въездные и выездные стойки
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            Стойки управления въездом и выездом для автоматических парковочных
            систем: промышленное исполнение, интеграция с РОСПАРК и СКУД.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Назначение стоек
              </h2>
              <p className="text-slate-600 mb-6">
                Въездные и выездные стойки обеспечивают управление доступом
                транспорта на парковку, взаимодействуют с камерами,
                шлагбаумами и программным обеспечением РОСПАРК.
              </p>

              <ul className="space-y-3 text-slate-700">
                <li>• Управление въездом и выездом</li>
                <li>• Интеграция с шлагбаумами</li>
                <li>• Подключение камер распознавания номеров</li>
                <li>• Работа в автоматическом и полуавтоматическом режимах</li>
              </ul>
            </div>

            <div className="bg-slate-100 rounded-xl p-10 text-center text-slate-400 border">
              [ Здесь будет изображение или карусель стоек ]
            </div>

          </div>

          <div className="mt-16">
            <Link
              href="/oborudovanie"
              className="text-blue-600 font-medium hover:underline"
            >
              ← Вернуться к оборудованию
            </Link>
          </div>

        </div>
      </section>

    </main>
  )
}
