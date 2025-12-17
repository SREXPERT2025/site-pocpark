import Link from 'next/link';

export default function CallToAction() {
  return (
    <section className="py-20 bg-slate-800 text-white">
      <div className="container mx-auto px-4 text-center">

        <h2 className="text-3xl font-bold mb-6">
          Обсудим требования службы безопасности
        </h2>

        <p className="text-slate-300 max-w-2xl mx-auto mb-10 text-lg">
          Мы не навязываем готовые решения.  
          Прорабатываем архитектуру доступа, сценарии блокировок,
          хранение данных и действия при нештатных ситуациях
          совместно со службой безопасности объекта.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/contacts"
            className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
          >
            Запросить регламент и схемы
          </Link>

          <a
            href="https://t.me/rospark_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="px-10 py-5 bg-slate-700 border border-slate-600 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            Связаться через Telegram
          </a>
        </div>

        <p className="mt-6 text-sm text-slate-400">
          Консультация не обязывает к внедрению.  
          Работаем в рамках требований ИБ и внутренних регламентов заказчика.
        </p>

      </div>
    </section>
  );
}
