export type AnswerFirstProps = {
  /** Короткий ответ (1–2 предложения) — главный смысл страницы. */
  lead: string;
  /** 3–7 тезисов “что вы получаете” (Key Takeaways). */
  bullets: string[];
  /** Заголовок блока (опционально). */
  title?: string;
  /** Доп. классы секции. */
  className?: string;
};

/**
 * Answer-first блок: короткий смысл + тезисы.
 * Должен находиться в верхней части страницы (после Hero) и быть понятным без контекста.
 */
export default function AnswerFirst({
  lead,
  bullets,
  title = 'Главное за 30 секунд',
  className = '',
}: AnswerFirstProps) {
  return (
    <section className={className}>
      <div className="container mx-auto px-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="mb-3 inline-flex items-center rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
            {title}
          </div>

          <p className="text-lg font-semibold text-slate-900">{lead}</p>

          {bullets?.length ? (
            <div className="mt-5 grid gap-3 text-slate-700 md:grid-cols-2">
              {bullets.map((b, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="mt-1 text-green-600">✓</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
