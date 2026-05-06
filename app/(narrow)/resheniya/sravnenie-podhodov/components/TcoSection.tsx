export default function TcoSection() {
  return (
    <section className="py-16 bg-slate-950 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ключевой вопрос: цена или стоимость владения?
          </h2>

          <p className="mt-4 text-slate-300 text-lg">
            Дешевле “на старте” не всегда означает дешевле “в итоге”.
            В парковочных системах критичны простои, спорные ситуации, человеческий фактор и поддержка.
          </p>

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-3xl">⏱️</div>
              <h3 className="mt-3 font-bold text-lg">Стоимость простоя</h3>
              <p className="mt-2 text-slate-300">
                Очередь на выезде и “не принимает оплату” быстро превращаются в жалобы арендаторов и потери выручки.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-3xl">🧩</div>
              <h3 className="mt-3 font-bold text-lg">Стыковки и ответственность</h3>
              <p className="mt-2 text-slate-300">
                Когда 3 подрядчика — у каждого “это не у нас”. TCO растет из-за времени и нервов.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-3xl">📊</div>
              <h3 className="mt-3 font-bold text-lg">Прозрачность и контроль</h3>
              <p className="mt-2 text-slate-300">
                Собственнику важны отчеты и исключение серых схем, а не просто “шлагбаум открывается”.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-bold text-lg">Вывод</h3>
            <p className="mt-2 text-slate-300">
              Если цель — управляемый актив (отчётность по выручке, условия сопровождения, контроль доступа и масштабирование),
              выбирайте подход, где ответственность едина и процессы формализованы.
              Если задача — быстро протестировать монетизацию без CAPEX, допустим “ревшэр”, но с пониманием ограничений.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
