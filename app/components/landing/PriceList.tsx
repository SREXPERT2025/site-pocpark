const prices = [
  { title: "Ниппельный выезд", desc: "Для зон погрузки и служебных проездов", price: "245 000" },
  { title: "Въезд по Госномеру", desc: "Камеры LPR + Стойки + ПО", price: "1 350 000" },
  { title: "Автоматическая парковка", desc: "Безбилетная система, полная автоматизация", price: "2 000 000" },
  { title: "Парковочная система PRO", desc: "Контроль гостей, сотрудников, оплата", price: "2 500 000" },
];

export default function PriceList() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Типовые решения и цены</h2>
          <p className="text-slate-600">Прозрачное ценообразование для проектов любого масштаба</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {prices.map((item) => (
            <div key={item.title} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-bold text-lg text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 mb-4 min-h-[40px]">{item.desc}</p>
              <div className="mt-auto">
                <span className="text-xs text-slate-400 uppercase font-semibold">Стоимость от</span>
                <div className="text-2xl font-bold text-blue-600">{item.price} ₽</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
           <p className="text-sm text-slate-400">* Стоимость может меняться в зависимости от комплектации и курса валют</p>
        </div>
      </div>
    </section>
  );
}
