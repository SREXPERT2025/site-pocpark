import Link from 'next/link';

export default function CallToAction() {
  return (
    <section className="py-20 bg-emerald-600 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">

          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Нужны схемы, спецификация или ТКП?
          </h2>

          <p className="text-lg md:text-xl text-emerald-100 mb-10">
            Мы поможем на этапе проектирования, подберём конфигурацию
            и подготовим техническое предложение под ваш объект.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <Link
              href="/contacts"
              className="px-8 py-4 bg-white text-emerald-700 font-bold rounded-lg shadow hover:bg-emerald-50 transition"
            >
              Запросить ТКП
            </Link>

            <a
              href="https://t.me/rospark_bot"
              target="_blank"
              className="px-8 py-4 bg-emerald-700 border border-emerald-400 rounded-lg font-semibold hover:bg-emerald-800 transition"
            >
              Задать вопрос инженеру
            </a>
          </div>

          <p className="text-sm text-emerald-200 opacity-80">
            Консультация и первичный расчёт — бесплатно.  
            Без обязательств и «продажного давления».
          </p>

        </div>
      </div>
    </section>
  );
}
