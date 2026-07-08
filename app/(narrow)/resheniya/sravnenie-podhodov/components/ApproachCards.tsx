import Link from 'next/link';

export default function ApproachCards() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Разбор каждого подхода
          </h2>
          <p className="mt-4 text-slate-600">
            Ниже — плюсы/минусы и когда подход действительно применим.
          </p>
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-6">
          <Card
            badge="1"
            title="Аренда оборудования и дохода"
            subtitle="Оператор ставит систему, вы делите выручку"
            pros={[
              'Почти не требует капитальных затрат на старте',
              'Быстрый запуск при типовом сценарии',
              'Часть операционных задач уходит оператору',
            ]}
            cons={[
              'Вы зависите от условий аренды и регламента реакции поддержки',
              'Меньше управляемости и “прозрачности” под задачи собственника',
              'Конфликт интересов: оператору выгодна выручка, собственнику — контроль и качество',
            ]}
            when={[
              'Нет бюджета на CAPEX, но нужно запустить монетизацию',
              'Временный/тестовый сценарий',
              'Объект готов жить в модели “ревшэр”',
            ]}
            linkHref="/resheniya/dlya-rukovoditeley"
            linkText="Посмотреть страницу для руководителей"
          />

          <Card
            badge="2"
            title='“Коробочное” решение + отдельный монтаж'
            subtitle="Купили оборудование/ПО, наняли монтажников, интеграторов"
            pros={[
              'Можно оптимизировать закупку под бюджет',
              'Гибкость по подрядчикам и компонентам',
              'Подходит, если у вас сильная служба эксплуатации/ИТ',
            ]}
            cons={[
              'Высокий риск “стыковок”: железо/ПО/монтаж/сеть/СКУД',
              'Ответственность размыта между подрядчиками',
              'Поддержка и обновления могут стать болью',
            ]}
            when={[
              'Есть опытные инженеры/ИТ, готовые владеть системой',
              'Проект простой и хорошо формализован',
              'Нужна максимальная кастомизация и вы готовы управлять интеграцией',
            ]}
            linkHref="/resheniya/dlya-inzhenerov"
            linkText="Посмотреть страницу для инженеров"
            accent="emerald"
          />

          <Card
            badge="3"
            title="Система под ключ от производителя (РОСПАРК)"
            subtitle="Единый контур: оборудование + ПО + внедрение + поддержка"
            pros={[
              'Единая ответственность и понятные сроки реакции поддержки',
              'Финансовая прозрачность и управляемость “по умолчанию”',
              'Проектный подход: обследование → ТЗ → внедрение → регламенты',
            ]}
            cons={[
              'Входной бюджет выше, чем “нулевой” ревшэр',
              'Требует нормального обследования и согласований (как любой взрослый проект)',
              'Нужно фиксировать KPI и требования заранее (что является плюсом при управлении)',
            ]}
            when={[
              'Важны надежность, масштабирование и TCO',
              'Нужны отчеты, контроль и отсутствие “серых” зон',
              'Объект — торговый центр, бизнес-центр или жилой комплекс, где критичны безопасность, выручка и качество сервиса',
            ]}
            linkHref="/resheniya/dlya-sluzhby-bezopasnosti"
            linkText="Посмотреть страницу для службы безопасности"
            accent="amber"
          />
        </div>

        <div className="mt-10 bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Хотите выбрать подход за 10 минут?
              </h3>
              <p className="mt-1 text-slate-600">
                Скажете тип объекта и цель (контроль / монетизация / закрытый двор) — предложим оптимальный вариант.
              </p>
            </div>
            <Link
              href="/quiz?source=project"
              className="px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors font-semibold"
            >
              Обсудить проект
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({
  badge,
  title,
  subtitle,
  pros,
  cons,
  when,
  linkHref,
  linkText,
  accent,
}: {
  badge: string;
  title: string;
  subtitle: string;
  pros: string[];
  cons: string[];
  when: string[];
  linkHref: string;
  linkText: string;
  accent?: 'emerald' | 'amber';
}) {
  const accentClasses =
    accent === 'emerald'
      ? {
          badge: 'bg-emerald-600/10 text-emerald-700 border-emerald-200',
          border: 'hover:border-emerald-200',
          link: 'text-emerald-700 hover:text-emerald-800',
        }
      : accent === 'amber'
      ? {
          badge: 'bg-amber-500/10 text-amber-700 border-amber-200',
          border: 'hover:border-amber-200',
          link: 'text-amber-700 hover:text-amber-800',
        }
      : {
          badge: 'bg-blue-600/10 text-blue-700 border-blue-200',
          border: 'hover:border-blue-200',
          link: 'text-blue-700 hover:text-blue-800',
        };

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all ${accentClasses.border}`}>
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold ${accentClasses.badge}`}>
        <span>{badge}</span>
        <span>Подход</span>
      </div>

      <h3 className="mt-4 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600">{subtitle}</p>

      <div className="mt-6 space-y-5">
        <Block title="Плюсы" items={pros} icon="✅" />
        <Block title="Минусы" items={cons} icon="⚠️" />
        <Block title="Когда применимо" items={when} icon="🎯" />
      </div>

      <div className="mt-6">
        <Link href={linkHref} className={`font-semibold ${accentClasses.link}`}>
          {linkText} →
        </Link>
      </div>
    </div>
  );
}

function Block({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <ul className="mt-2 space-y-2 text-slate-700">
        {items.map((x, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-slate-400">•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
