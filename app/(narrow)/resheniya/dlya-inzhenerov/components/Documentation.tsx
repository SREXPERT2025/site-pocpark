import Link from 'next/link';

export default function Documentation() {
  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">

          {/* Заголовок */}
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Техническая документация и схемы
            </h2>
            <p className="text-lg text-slate-600">
              Всё, что нужно инженеру для проектирования, монтажа и эксплуатации —
              без маркетинга и «воды».
            </p>
          </div>

          {/* Карточки */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">

            {/* Схемы */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition">
              <div className="text-3xl mb-4">📐</div>
              <h3 className="text-xl font-semibold mb-3">
                Схемы подключения
              </h3>
              <p className="text-slate-600 mb-4">
                Электрические схемы, топологии сети, варианты подключения контроллеров,
                камер, паркоматов и периферии.
              </p>
              <ul className="text-sm text-slate-500 space-y-1 mb-4">
                <li>• PDF (проектные схемы)</li>
                <li>• DWG (для AutoCAD)</li>
                <li>• Однолинейные и структурные схемы</li>
              </ul>
              <span className="inline-block text-sm font-medium text-emerald-600">
                По запросу
              </span>
            </div>

            {/* База знаний */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition">
              <div className="text-3xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-3">
                База знаний
              </h3>
              <p className="text-slate-600 mb-4">
                Практические инструкции по настройке, типовые ошибки,
                обновления ПО и рекомендации по эксплуатации.
              </p>
              <ul className="text-sm text-slate-500 space-y-1 mb-4">
                <li>• Настройка контроллеров</li>
                <li>• Работа с камерами и LPR</li>
                <li>• Обновления и совместимость версий</li>
              </ul>
              <Link
                href="/vozmozhnosti"
                className="inline-block text-sm font-medium text-emerald-600 hover:underline"
              >
                Перейти к возможностям →
              </Link>
            </div>

            {/* Техподдержка */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition">
              <div className="text-3xl mb-4">🛠</div>
              <h3 className="text-xl font-semibold mb-3">
                Инженерная поддержка
              </h3>
              <p className="text-slate-600 mb-4">
                Помогаем на этапе проектирования, пусконаладки и в процессе эксплуатации.
                Говорим на одном языке с инженерами.
              </p>
              <ul className="text-sm text-slate-500 space-y-1 mb-4">
                <li>• Консультации по интеграции</li>
                <li>• Разбор нестандартных кейсов</li>
                <li>• Поддержка внедрений</li>
              </ul>
              <Link
                href="/quiz?source=consult"
                className="inline-block text-sm font-medium text-emerald-600 hover:underline"
              >
                Связаться с техподдержкой →
              </Link>
            </div>

          </div>

          {/* Подвал блока */}
          <div className="text-center text-sm text-slate-500">
            Документация предоставляется зарегистрированным партнёрам и заказчикам РОСПАРК.
          </div>

        </div>
      </div>
    </section>
  );
}
