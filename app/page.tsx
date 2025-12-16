import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, ParkingSquare, MonitorSmartphone, Settings2, BarChart3, ShieldCheck, Clock } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      
      {/* --- БЛОК 1: HERO (Первый экран) --- */}
      <section className="relative flex min-h-[85vh] flex-col justify-center overflow-hidden bg-slate-950 px-6 py-24 text-white sm:py-32 lg:px-8">
        {/* Абстрактный фон (имитация техно) */}
        <div className="absolute inset-0 z-0 opacity-20">
             <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Автоматизация парковки, которая увеличивает доход и снижает операционные затраты
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Проектируем, внедряем и обслуживаем умные парковочные системы для коммерческой недвижимости. Управляйте выручкой, а не шлагбаумами.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto text-lg font-semibold bg-blue-600 hover:bg-blue-500">
              Рассчитать стоимость проекта
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg font-semibold border-slate-700 text-white hover:bg-slate-800 hover:text-white" asChild>
              <Link href="#solutions">Смотреть решения</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --- БЛОК 2: СЕГМЕНТАЦИЯ --- */}
      <section id="solutions" className="bg-slate-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Понимаем вашу специфику. Предлагаем готовые решения.
            </h2>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:max-w-none lg:grid-cols-3">
            {[
              { title: 'Для торговых центров', href: '/resheniya/torgovye-centry', icon: ParkingSquare },
              { title: 'Для бизнес-центров и УК', href: '/resheniya/biznes-centry', icon: Settings2 },
              { title: 'Для девелоперов', href: '/resheniya/zastroyschiki', icon: MonitorSmartphone },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group relative flex flex-col items-start justify-between rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md hover:ring-blue-500"
              >
                <div className="mb-4 rounded-lg bg-blue-50 p-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold leading-7 text-slate-900 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <div className="mt-4 flex items-center text-sm font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Подробнее <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- БЛОК 3: КАК ЭТО РАБОТАЕТ --- */}
      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600">Процесс</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              От въезда до аналитики за 3 шага
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {[
                {
                  name: 'Въезд без билетов',
                  description: 'Система распознает номер автомобиля за 0,3 секунды и автоматически открывает шлагбаум. Больше никаких пробок.',
                  icon: Clock,
                },
                {
                  name: 'Удобная оплата',
                  description: 'Клиент оплачивает парковку через паркомат, мобильное приложение или по QR-коду. Быстро и без кассира.',
                  icon: CheckCircle2,
                },
                {
                  name: 'Полный контроль',
                  description: 'Контроль над финансовыми потоками и аналитикой парковки в личном кабинете управляющего.',
                  icon: BarChart3,
                },
              ].map((feature, idx) => (
                <div key={feature.name} className="flex flex-col relative pl-16">
                  <dt className="text-base font-bold leading-7 text-slate-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-slate-600">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* --- БЛОК 4: ВИТРИНА ПРОДУКТОВ --- */}
      <section className="bg-slate-900 py-24 sm:py-32 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Компоненты вашей системы</h2>
            <p className="mt-4 text-lg text-slate-400">Надежное оборудование и современное ПО</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
             {/* Карточка 1 */}
            <div className="flex flex-col overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
               <div className="p-8">
                 <h3 className="text-xl font-bold">Паркомат «Гранит-М»</h3>
                 <p className="mt-4 text-sm leading-6 text-slate-400">Принимает все виды платежей, работает 24/7 в любых погодных условиях от -40 до +50.</p>
               </div>
               <div className="mt-auto p-8 pt-0">
                  <Link href="/oborudovanie/parkomat-granit" className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center">
                    Подробнее <ArrowRight className="ml-2 h-4 w-4"/>
                  </Link>
               </div>
            </div>

            {/* Карточка 2 */}
            <div className="flex flex-col overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
               <div className="p-8">
                 <h3 className="text-xl font-bold">ПО «Rospark Cloud»</h3>
                 <p className="mt-4 text-sm leading-6 text-slate-400">Единый центр управления. Аналитика, тарифы, отчеты и управление правами доступа — всё в браузере.</p>
               </div>
               <div className="mt-auto p-8 pt-0">
                  <Link href="/resheniya/software" className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center">
                    Подробнее <ArrowRight className="ml-2 h-4 w-4"/>
                  </Link>
               </div>
            </div>

            {/* Карточка 3 */}
            <div className="flex flex-col overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
               <div className="p-8">
                 <h3 className="text-xl font-bold">Система LPR «ОКО»</h3>
                 <p className="mt-4 text-sm leading-6 text-slate-400">Распознавание 98% номеров даже в сложных условиях: ночью, в дождь, снегопад или при загрязнении.</p>
               </div>
               <div className="mt-auto p-8 pt-0">
                  <Link href="/oborudovanie/camera-lpr" className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center">
                    Подробнее <ArrowRight className="ml-2 h-4 w-4"/>
                  </Link>
               </div>
            </div>
          </div>
        </div>
      </section>

       {/* --- БЛОК 5: ЦИФРЫ --- */}
       <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
           <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Результаты в цифрах</h2>
          </div>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
            {[
              { id: 1, name: 'Средний рост выручки', value: '+25%' },
              { id: 2, name: 'Сокращение затрат на персонал', value: 'до 70%' },
              { id: 3, name: 'Техническая поддержка', value: '24/7' },
            ].map((stat) => (
              <div key={stat.id} className="mx-auto flex max-w-xs flex-col gap-y-4">
                <dt className="text-base leading-7 text-slate-600">{stat.name}</dt>
                <dd className="order-first text-5xl font-bold tracking-tight text-blue-600 sm:text-6xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* --- БЛОК 6: CTA FORM --- */}
      <section className="bg-blue-600 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Узнайте, сколько может зарабатывать ваша парковка
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Оставьте заявку, и наш инженер бесплатно подготовит предварительный расчет окупаемости и план внедрения.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-y-4 sm:flex-row sm:gap-x-4">
               {/* Простая имитация формы для MVP */}
               <input 
                  type="text" 
                  placeholder="Ваш телефон" 
                  className="min-w-0 flex-auto rounded-md border-0 bg-white/10 px-3.5 py-3 text-white shadow-sm ring-1 ring-inset ring-white/20 placeholder:text-blue-200 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6 sm:w-80"
               />
               <Button size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50">
                  Получить расчет
               </Button>
            </div>
             <p className="mt-4 text-xs text-blue-200">Это бесплатно и ни к чему не обязывает.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
