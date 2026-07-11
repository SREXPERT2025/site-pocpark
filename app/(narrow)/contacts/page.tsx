import type { Metadata } from 'next'
import Link from 'next/link'
import LeadFormSection from '@/app/components/forms/LeadFormSection'
import { canonicalUrl } from '@/app/config/site-url'

export const metadata: Metadata = {
  title: 'Контакты — РОСПАРК',
  description:
    'Контакты компании РОСПАРК. Консультации по автоматизации парковок, техническая поддержка, коммерческие предложения.',
  alternates: {
    canonical: canonicalUrl('/contacts'),
  },
}

export default function ContactsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <section className="overflow-hidden border-b bg-slate-50 pb-12 pt-28 sm:pb-16 sm:pt-32">
        <div className="container mx-auto max-w-5xl px-4">
          <h1 className="mb-4 break-words text-[34px] font-bold leading-[1.12] sm:text-5xl">
            Контакты
          </h1>
          <p className="max-w-3xl break-words text-base leading-relaxed text-slate-600 sm:text-lg">
            Свяжитесь с РОСПАРК, чтобы обсудить объект, подобрать оборудование, спланировать внедрение или получить поддержку.
          </p>
        </div>
      </section>

      <section className="overflow-hidden py-12 sm:py-20">
        <div className="container mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 md:grid-cols-2 md:gap-12">
          <div className="min-w-0 overflow-hidden rounded-2xl border bg-white p-5 sm:p-8">
            <h2 className="mb-5 break-words text-[24px] font-semibold leading-tight sm:text-3xl">
              Как связаться с РОСПАРК
            </h2>

            <ul className="max-w-full space-y-4 overflow-hidden text-base leading-relaxed text-slate-700 sm:text-lg">
              <li className="min-w-0 break-words">
                <strong>Телефон:</strong>{' '}
                <a
                  href="tel:+74993212040"
                  className="break-all text-blue-600 hover:underline"
                >
                  +7 (499) 321-20-40
                </a>
              </li>
              <li className="min-w-0 break-words">
                <strong>Эл. почта:</strong>{' '}
                <a
                  href="mailto:is@srexpert.su"
                  className="break-all text-blue-600 hover:underline"
                >
                  is@srexpert.su
                </a>
              </li>
            </ul>

            <div className="mt-8">
              <Link
                href="/resheniya/dlya-rukovoditeley"
                className="inline-block break-words text-base font-medium text-blue-600 hover:underline sm:text-lg"
              >
                → Посмотреть решения
              </Link>
            </div>
          </div>

          <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border bg-slate-50 p-5 sm:p-8">
            <h2 className="mb-5 max-w-full break-words text-[24px] font-semibold leading-tight sm:text-3xl">
              Юридическая информация
            </h2>

            <ul className="max-w-full space-y-3 overflow-hidden text-base leading-relaxed text-slate-700 sm:text-lg">
              <li className="min-w-0 break-words">
                <strong>Юридическое лицо:</strong> ООО «СР Эксперт»
              </li>
              <li className="min-w-0 break-words">
                <strong>ИНН:</strong> 5040100635
              </li>
              <li className="min-w-0 break-words">
                <strong>ОГРН:</strong> 1105040005124
              </li>
              <li className="min-w-0 break-words">
                <strong>Юридический адрес:</strong> 140108, Московская область, г. Раменское, ул. Михалевича, д. 51А, комната 61
              </li>
              <li className="min-w-0 break-words">
                <strong>Офис продаж:</strong> 123298, Россия, г. Москва, ул. Народного ополчения, д.38к3, офис 117
              </li>
            </ul>

            <p className="mt-6 break-words text-sm leading-relaxed text-slate-500">
              Информация на сайте не является публичной офертой.
            </p>
          </div>
        </div>
      </section>

      <LeadFormSection
        sourceSection="contacts"
        title="Получить консультацию"
        description="Оставьте контакты — уточним задачу, параметры объекта и следующий шаг по проекту."
        submitLabel="Отправить"
      />
    </main>
  )
}
