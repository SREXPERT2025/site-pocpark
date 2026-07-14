const reliabilityItems = [
  {
    icon: '⚡',
    title: 'Отключение электропитания',
    text: 'При наличии ИБП ключевые узлы могут продолжить работу в пределах предусмотренного времени автономии.',
  },
  {
    icon: '🌐',
    title: 'Потеря интернет-соединения',
    text: 'Если локальный режим предусмотрен проектом, события сохраняются на объекте и синхронизируются после восстановления связи.',
  },
  {
    icon: '🔌',
    title: 'Обрыв линий связи',
    text: 'Резервные каналы и локальная логика контроллеров предусматриваются проектом с учётом требований объекта.',
  },
  {
    icon: '🧠',
    title: 'Локальная логика принятия решений',
    text: 'Списки доступа и сценарии могут выполняться локально, если это заложено в выбранную архитектуру системы.',
  },
  {
    icon: '📋',
    title: 'Журналирование и аудит',
    text: 'Предусмотренные проектом действия операторов и автоматические события журналируются для последующей проверки.',
  },
  {
    icon: '🛑',
    title: 'Ручной режим и аварийные сценарии',
    text: 'Предусмотрены регламентированные режимы: запрет проезда, свободный проезд и управление по кнопке охраны.',
  },
]

export default function Reliability() {
  return (
    <section id="reliability" className="overflow-hidden bg-slate-900 py-14 text-white sm:py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <h2 className="mx-auto mb-8 max-w-3xl break-words text-center text-[28px] font-bold leading-tight sm:mb-12 sm:text-4xl">
          Отказоустойчивость и работа в нештатных ситуациях
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {reliabilityItems.map((item) => (
            <article
              key={item.title}
              className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6"
            >
              <div className="flex min-w-0 gap-4">
                <div className="flex-shrink-0 text-2xl leading-none text-red-400 sm:text-3xl">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="mb-2 max-w-full break-words text-base font-bold leading-snug sm:text-lg md:text-xl">
                    {item.title}
                  </h3>
                  <p className="max-w-full break-words text-base leading-relaxed text-slate-300 sm:text-lg">
                    {item.text}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
