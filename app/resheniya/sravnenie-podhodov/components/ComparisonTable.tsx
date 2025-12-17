export default function ComparisonTable() {
  return (
    <section id="table" className="py-16 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Краткое сравнение подходов
          </h2>
          <p className="mt-4 text-slate-600">
            Быстрое ориентирование. Ниже — детализация по каждому варианту и когда он реально применим.
          </p>
        </div>

        <div className="mt-10 overflow-x-auto">
          <div className="min-w-[980px] bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="grid grid-cols-4 text-sm">
              <div className="p-5 font-semibold text-slate-900 border-b border-slate-200">
                Критерий
              </div>
              <div className="p-5 font-semibold text-slate-900 border-b border-slate-200">
                1) Аренда + % от дохода
              </div>
              <div className="p-5 font-semibold text-slate-900 border-b border-slate-200">
                2) “Коробка” + отдельный монтаж
              </div>
              <div className="p-5 font-semibold text-slate-900 border-b border-slate-200">
                3) Под ключ от производителя (РОСПАРК)
              </div>

              {rows.map((r, idx) => (
                <Row key={idx} {...r} />
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Примечание: итоговая “выгодность” зависит от тарификации, трафика, доли безнала, требований СБ/ИТ и
            текущей инфраструктуры объекта.
          </p>
        </div>
      </div>
    </section>
  );
}

function Row({
  title,
  a,
  b,
  c,
}: {
  title: string;
  a: string;
  b: string;
  c: string;
}) {
  return (
    <>
      <div className="p-5 border-t border-slate-200 text-slate-900 font-medium bg-slate-50/60">
        {title}
      </div>
      <div className="p-5 border-t border-slate-200 text-slate-700">{a}</div>
      <div className="p-5 border-t border-slate-200 text-slate-700">{b}</div>
      <div className="p-5 border-t border-slate-200 text-slate-700">{c}</div>
    </>
  );
}

const rows = [
  {
    title: 'Входной бюджет',
    a: 'Минимальный (часто “0 ₽ на старте”)',
    b: 'Средний (железо + монтаж + настройка)',
    c: 'Плановый CAPEX, но прозрачный состав работ',
  },
  {
    title: 'Контроль и права на систему',
    a: 'Часто ограничен (вы зависите от владельца оборудования)',
    b: 'Сильно зависит от подрядчиков и компетенций',
    c: 'Полный контроль + единый поставщик',
  },
  {
    title: 'Финансовая прозрачность',
    a: 'Не всегда: модель ревшэра может конфликтовать с задачей контроля',
    b: 'Зависит от софта и корректной интеграции',
    c: 'Делается “из коробки” как управленческая функция',
  },
  {
    title: 'Риски эксплуатации',
    a: 'Зависимость от арендатора/оператора (условия, SLA)',
    b: 'Риск “лоскутного одеяла” (разные подрядчики)',
    c: 'Снижение рисков за счет единой ответственности',
  },
  {
    title: 'Срок запуска',
    a: 'Быстро, если типовой кейс',
    b: 'Часто растягивается из-за стыковок',
    c: 'Управляемый проектный график',
  },
  {
    title: 'Лучше всего подходит',
    a: 'Объекты без бюджета/в тест гипотезы монетизации',
    b: 'Когда есть сильная внутренняя эксплуатация и понятный проект',
    c: 'Когда важны надежность, масштабирование и TCO',
  },
];
