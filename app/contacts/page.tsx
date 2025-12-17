import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Контакты — РОСПАРК',
  description:
    'Контакты компании РОСПАРК. Консультации по автоматизации парковок, техническая поддержка, коммерческие предложения.',
}

export default function ContactsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <section className="pt-32 pb-16 bg-slate-50 border-b">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="text-4xl font-bold mb-4">Контакты</h1>
          <p className="text-lg text-slate-600">
            Свяжитесь с командой РОСПАРК — поможем подобрать и внедрить решение
            под ваш объект.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-5xl grid md:grid-cols-2 gap-12">
          
          {/* CONTACT INFO */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Как с нами связаться
            </h2>

            <ul className="space-y-4 text-slate-700">
              <li>
                <strong>Телефон:</strong>{' '}
                <a href="tel:+7XXXXXXXXXX" className="text-blue-600 hover:underline">
                  +7 (XXX) XXX-XX-XX
                </a>
              </li>

              <li>
                <strong>Email:</strong>{' '}
                <a href="mailto:info@rospark.ru" className="text-blue-600 hover:underline">
                  info@rospark.ru
                </a>
              </li>

              <li>
                <strong>Telegram:</strong>{' '}
                <a
                  href="https://t.me/rospark_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  @rospark_bot
                </a>
              </li>
            </ul>

            <div className="mt-8">
              <Link
                href="/resheniya"
                className="inline-block text-blue-600 font-medium hover:underline"
              >
                → Перейти к решениям
              </Link>
            </div>
          </div>

          {/* LEGAL */}
          <div className="bg-slate-50 rounded-xl p-8 border">
            <h2 className="text-2xl font-semibold mb-6">
              Юридическая информация
            </h2>

            <ul className="space-y-3 text-slate-700 text-sm">
              <li>
                <strong>Юридическое лицо:</strong> ООО «СР Эксперт»
              </li>
              <li>
                <strong>ИНН / КПП:</strong> (указать при необходимости)
              </li>
              <li>
                <strong>ОГРН:</strong> (указать при необходимости)
              </li>
              <li>
                <strong>Адрес:</strong> Российская Федерация
              </li>
            </ul>

            <p className="mt-6 text-xs text-slate-500">
              Информация на сайте не является публичной офертой.
            </p>
          </div>

        </div>
      </section>
    </main>
  )
}
