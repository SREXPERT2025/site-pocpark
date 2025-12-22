import Link from 'next/link';
import LeadForm from '@/app/components/forms/LeadForm';

export default function CallToAction() {
  return (
    <section
      id="quiz"
      className="py-24 bg-blue-600 text-white"
    >
      <div className="container mx-auto px-4">

        <div className="max-w-3xl mx-auto text-center">

          {/* Заголовок */}
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Рассчитайте окупаемость парковки для вашего объекта
          </h2>

          {/* Подзаголовок */}
          <p className="text-xl text-blue-100 mb-10">
            Мы бесплатно проведём аудит и покажем,
            как увеличить доход и убрать операционные потери.
            <br className="hidden md:block" />
            Расчёт и коммерческое предложение — <b>за 1 рабочий день</b>.
          </p>

          {/* Кнопки */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Link
              href="/contacts"
              className="px-10 py-5 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors"
            >
              Получить расчёт
            </Link>

            <a
              href="https://t.me/rospark_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-5 bg-blue-700 border border-blue-500 hover:bg-blue-800 font-bold rounded-xl transition-colors"
            >
              Написать в Telegram
            </a>
          </div>

          <div className="mx-auto max-w-xl">
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
