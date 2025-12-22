import Link from 'next/link';

export default function CallToAction() {
  const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_CONTACT_URL;

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 md:p-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Хотите точный ответ под ваш объект?
            </h2>
            <p className="mt-4 text-slate-600 text-lg">
              Напишите тип объекта (ТЦ/БЦ/ЖК), количество въездов/выездов и что важнее:
              контроль выручки, безопасность, скорость проезда или удобство для клиентов.
              Мы предложим подход и дорожную карту.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/contacts"
                className="px-8 py-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors font-semibold text-center"
              >
                Запросить аудит / КП
              </Link>

              {telegramUrl ? (
  <a
    href={telegramUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="px-8 py-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 transition-colors font-semibold text-center"
  >
    Написать в Telegram
  </a>
) : null}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              ООО &quot;СР Эксперт&quot; используется в футере сайта и на специализированных страницах (например, “О компании”).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
