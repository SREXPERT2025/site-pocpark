import Link from 'next/link';
import LeadForm from '@/app/components/forms/LeadForm';

export default function CallToAction() {
  const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_CONTACT_URL;

  return (
    <section
      id="quiz"
      className="py-24 bg-blue-600 text-white"
    >
      <div className="container mx-auto px-4">

        <div className="mx-auto max-w-5xl text-center">

          {/* Заголовок */}
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Получите предварительную оценку проекта парковки
          </h2>

          {/* Подзаголовок */}
          <p className="text-xl text-blue-100 mb-10">
            Разберём вводные по объекту и подскажем, какие сценарии автоматизации подойдут.
            <br className="hidden md:block" />
            Срок подготовки предложения зависит от исходных данных и сложности объекта.
          </p>

          {/* Кнопки */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Link
              href="/contacts"
              className="inline-flex min-w-0 items-center justify-center px-6 py-4 text-center leading-snug sm:px-10 sm:py-5 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors"
            >
              Получить расчёт
            </Link>

            {telegramUrl ? (
  <a
    href={telegramUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex min-w-0 items-center justify-center px-6 py-4 text-center leading-snug sm:px-10 sm:py-5 bg-blue-700 border border-blue-500 hover:bg-blue-800 font-bold rounded-xl transition-colors"
  >
    Написать в Telegram
  </a>
) : null}
          </div>

          <div className="mx-auto w-full max-w-3xl">
            <LeadForm
              sourceSection="lead_cta"
              sourcePage="/resheniya/dlya-rukovoditeley"
              submitLabel="Получить расчёт"
              compact
            />
          </div>

          {/* Доверие */}
          <p className="text-sm text-blue-200 opacity-80">
            * Консультация не обязывает к покупке. 
            <br />
            Решение подбирается индивидуально под ваш объект.
          </p>

        </div>

      </div>
    </section>
  );
}
