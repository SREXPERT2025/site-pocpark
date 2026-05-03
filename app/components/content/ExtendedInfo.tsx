import { getExtendedContentBySlug } from '@/lib/content-parser';

export type ExtendedInfoProps = {
  /** Например: 'resheniya' | 'vozmozhnosti' */
  section: string;
  /** Например: 'dlya-rukovoditeley' */
  slug: string;
  /** Текст кнопки/summary */
  summaryLabel?: string;
  /** Доп. классы контейнера */
  className?: string;
};

/**
 * SSR-friendly блок расширенного контента.
 *
 * Принцип: минимальный продающий TSX сверху + "Расширенная информация" из MD.
 * Важно для GEO: контент присутствует в HTML при SSR (без обязательного JS).
 */
export default function ExtendedInfo({
  section,
  slug,
  summaryLabel = 'Расширенная информация',
  className = '',
}: ExtendedInfoProps) {
  const doc = getExtendedContentBySlug(section, slug);
  if (!doc) return null;

  return (
    <section className={className}>
      <div className="container mx-auto min-w-0 px-4">
        <details className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-6">
          <summary className="flex min-w-0 cursor-pointer select-none flex-col gap-3 text-left sm:flex-row sm:items-center">
            <span className="inline-flex min-h-9 min-w-0 max-w-full items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold leading-snug text-slate-900 shadow-sm ring-1 ring-slate-200 sm:h-9 sm:py-0">
              {summaryLabel}
            </span>

            <span className="min-w-0 text-sm leading-relaxed text-slate-600">
              Детали, FAQ, интеграции, варианты внедрения и нюансы эксплуатации.
            </span>

            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition-transform group-open:rotate-180 sm:ml-auto">
              ▾
            </span>
          </summary>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <div
              className="prose prose-slate max-w-none break-words prose-headings:break-words prose-p:break-words prose-li:break-words"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: doc.contentHtml }}
            />
          </div>
        </details>
      </div>
    </section>
  );
}
