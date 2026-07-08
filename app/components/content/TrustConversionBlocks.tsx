type TrustVariant = 'solutions' | 'features' | 'implementation';

type OutcomeItem = {
  title: string;
  description: string;
};

type ResponsibilityItem = {
  area: string;
  rospark: string;
  customer: string;
};

const outcomeByVariant: Record<TrustVariant, OutcomeItem[]> = {
  solutions: [
    {
      title: 'Понятный сценарий работы парковки',
      description: 'Фиксируем въезд, выезд, оплату, доступы, роли операторов и спорные ситуации до запуска.',
    },
    {
      title: 'Управляемая эксплуатация',
      description: 'После внедрения остаются журнал событий, отчётность, роли пользователей и понятные правила изменений.',
    },
    {
      title: 'Меньше ручных операций',
      description: 'Охрана и администраторы работают по регламенту, а не решают каждую ситуацию вручную.',
    },
    {
      title: 'Система с запасом для развития',
      description: 'Можно добавлять оплату, распознавание номеров, интеграции и новые категории пользователей по этапам.',
    },
  ],
  features: [
    {
      title: 'Связанные функции вместо разрозненных модулей',
      description: 'Оплата, распознавание номеров, гостевые заявки и доступы работают как единый сценарий.',
    },
    {
      title: 'Понятный путь клиента',
      description: 'Посетитель понимает, как въехать, оплатить, получить доступ и выехать без лишнего участия персонала.',
    },
    {
      title: 'Контроль для управляющей компании',
      description: 'События, платежи, исключения и ручные решения фиксируются в системе и доступны для проверки.',
    },
    {
      title: 'Масштабирование без переделки логики',
      description: 'Новые правила, зоны, роли и интеграции добавляются поверх согласованной архитектуры.',
    },
  ],
  implementation: [
    {
      title: 'Согласованный объём работ',
      description: 'До старта понятно, что внедряется, какие ограничения есть на объекте и какой результат ожидается.',
    },
    {
      title: 'Единая точка ответственности',
      description: 'Оборудование, сценарии, настройка и сопровождение не распадаются между несколькими подрядчиками.',
    },
    {
      title: 'Прозрачная передача в эксплуатацию',
      description: 'Заказчик получает рабочие правила, доступы, роли, документацию и понятную схему поддержки.',
    },
    {
      title: 'Основа для развития объекта',
      description: 'Система не устаревает после запуска: её можно расширять под новые задачи и потоки.',
    },
  ],
};

const responsibilityRows: ResponsibilityItem[] = [
  {
    area: 'Обследование и сценарии',
    rospark: 'Анализирует объект, транспортные потоки, ограничения и предлагает рабочую логику парковки.',
    customer: 'Даёт вводные по объекту, текущим проблемам, режимам работы и внутренним правилам.',
  },
  {
    area: 'Оборудование и программная часть',
    rospark: 'Подбирает состав системы, отвечает за совместимость, настройку и корректную работу сценариев.',
    customer: 'Согласует состав решения, места установки, доступ к инфраструктуре и требования эксплуатации.',
  },
  {
    area: 'Интеграции и данные',
    rospark: 'Описывает точки обмена, события, справочники, роли и резервные сценарии.',
    customer: 'Назначает ответственных за внешние системы, доступы, регламенты и требования безопасности.',
  },
  {
    area: 'Запуск и сопровождение',
    rospark: 'Проводит настройку, тестирование, обучение и поддержку после передачи в эксплуатацию.',
    customer: 'Принимает результат, назначает пользователей системы и сообщает о новых задачах развития.',
  },
];

export function ImplementationOutcomeBlock({
  variant = 'implementation',
}: {
  variant?: TrustVariant;
}) {
  const items = outcomeByVariant[variant];

  return (
    <section className="bg-white px-4 py-12 sm:px-6 md:py-16">
      <div className="mx-auto max-w-[1088px]">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            После внедрения
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Что получает заказчик
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Результат проекта — не только установленное оборудование. Важно, чтобы парковка стала
            управляемым процессом с понятными правилами, ответственностью и развитием.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ResponsibilityMatrixBlock() {
  return (
    <section className="bg-slate-50 px-4 py-12 sm:px-6 md:py-16">
      <div className="mx-auto max-w-[1088px]">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Ответственность
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Кто за что отвечает
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Разделение зон ответственности снижает риски: заказчик понимает, какие вводные нужны,
            а РОСПАРК отвечает за проектирование, настройку и сопровождение парковочной системы.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1fr_1.4fr_1.4fr] border-b border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 md:grid">
            <div className="p-4">Зона</div>
            <div className="border-l border-slate-200 p-4">РОСПАРК</div>
            <div className="border-l border-slate-200 p-4">Заказчик</div>
          </div>

          <div className="divide-y divide-slate-200">
            {responsibilityRows.map((row) => (
              <div key={row.area} className="grid gap-0 md:grid-cols-[1fr_1.4fr_1.4fr]">
                <div className="bg-slate-50 p-4 text-sm font-semibold text-slate-950 md:bg-white">
                  {row.area}
                </div>
                <div className="border-t border-slate-200 p-4 text-sm leading-6 text-slate-600 md:border-l md:border-t-0">
                  <span className="mb-1 block font-semibold text-slate-900 md:hidden">РОСПАРК</span>
                  {row.rospark}
                </div>
                <div className="border-t border-slate-200 p-4 text-sm leading-6 text-slate-600 md:border-l md:border-t-0">
                  <span className="mb-1 block font-semibold text-slate-900 md:hidden">Заказчик</span>
                  {row.customer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function TrustConversionBlocks({
  variant = 'implementation',
}: {
  variant?: TrustVariant;
}) {
  return (
    <>
      <ImplementationOutcomeBlock variant={variant} />
      <ResponsibilityMatrixBlock />
    </>
  );
}
