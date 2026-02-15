import Link from 'next/link';

export default function Integration() {
  return (
    <section className="py-20 bg-white border-t border-slate-200">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Интеграция с существующими системами
          </h2>

          <p className="text-lg text-slate-600 mb-12 max-w-3xl">
            РОСПАРК не требует «ломать» текущую инфраструктуру объекта.
            Система встраивается в существующие контуры безопасности,
            биллинга и учета через стандартные интерфейсы.
          </p>

          <div className="grid md:grid-cols-2 gap-10">
            {/* СКУД И БЕЗОПАСНОСТЬ */}
            <div className="rounded-2xl border border-slate-200 p-8 bg-slate-50">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                🛡️ СКУД и безопасность
              </h3>

              <ul className="space-y-4 text-slate-700">
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Интеграция с СКУД по событиям въезда / выезда
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Общие идентификаторы: карты, номера авто, BLE, QR
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Передача фото и событий в системы видеонаблюдения
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Работа в закрытых корпоративных сетях
                </li>
              </ul>
            </div>

            {/* ФИНАНСЫ И IT */}
            <div className="rounded-2xl border border-slate-200 p-8 bg-slate-50">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                💳 Финансы и IT-системы
              </h3>

              <ul className="space-y-4 text-slate-700">
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  REST API для биллинга и внешних сервисов
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Выгрузка данных в 1С и BI-системы
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Онлайн-оплаты, эквайринг, web-платежи
                </li>
                <li className="flex gap-3">
                  <span className="text-emerald-600 font-bold">•</span>
                  Разграничение прав доступа (ролевая модель)
                </li>
              </ul>
            </div>
          </div>

          {/* ВАЖНО ДЛЯ ИНЖЕНЕРА */}
          <div className="mt-14 bg-slate-900 text-white rounded-2xl p-8">
            <h3 className="text-xl font-bold mb-4">
              Что важно инженеру при внедрении
            </h3>

            <ul className="grid sm:grid-cols-2 gap-4 text-slate-300">
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                Не требуется замена всего оборудования
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                Возможна поэтапная миграция
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                Документированное API
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                Поддержка со стороны инженеров РОСПАРК
              </li>
            </ul>

            <div className="mt-6">
              <Link
                href="/contacts"
                className="inline-block mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
              >
                Запросить техническую консультацию
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
