import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Паркоматы для автоматических парковок — РОСПАРК',
  description:
    'Паркоматы РОСПАРК для автоматических парковок: оплата картами, QR, интеграция с парковочной системой, промышленное исполнение.',
}

export default function ParkomatyPage() {
  return (
    <main className="min-h-screen bg-white">
      
      {/* HERO */}
      <section className="pt-32 pb-16 bg-slate-50 border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          <h1 className="text-4xl font-bold mb-4">
            Паркоматы
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            Паркоматы для автоматических парковочных систем: приём безналичной
            оплаты, интеграция с РОСПАРК, промышленная надёжность.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Назначение паркоматов
              </h2>
              <p className="text-slate-600 mb-6">
                Паркоматы используются для самостоятельной оплаты парковки
                посетителями без участия оператора. Поддерживаются современные
                способы оплаты и интеграция с системой контроля въезда/выезда.
              </p>

              <ul className="space-y-3 text-slate-700">
                <li>• Оплата банковскими картами</li>
                <li>• QR / СБП</li>
                <li>• Интеграция с системой РОСПАРК</li>
                <li>• Промышленное исполнение</li>
              </ul>
            </div>

            <div className="bg-slate-100 rounded-xl p-10 text-center text-slate-400 border">
              [ Здесь будет изображение или карусель паркоматов ]
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
