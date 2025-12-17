import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-900 text-white">
      <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] opacity-20 bg-cover bg-center" />
      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 backdrop-blur-sm text-blue-300 text-sm font-medium">
          🚀 ООО «СР Эксперт» — работаем с 2010 года
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Автоматизация парковок <br />
          <span className="text-blue-500">для коммерческой недвижимости</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10">
          Повышаем выручку и безопасность объектов любого типа. 
          Профессиональные решения под ключ: от проекта до обслуживания.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/resheniya" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors">
            Подобрать решение
          </Link>
          <Link href="/contacts" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-semibold transition-colors">
            Связаться с нами
          </Link>
        </div>
      </div>
    </section>
  );
}
