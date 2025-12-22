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
      <div className="container mx-auto px-4">
        <details className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
          <summary className="flex cursor-pointer select-none items-center gap-3 text-left">
            <span className="inline-flex h-9 items-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200">
              {summaryLabel}
            </span>

            <span className="text-sm text-slate-600">
              Детали, FAQ, интеграции, варианты внедрения и нюансы эксплуатации.
            </span>

            <span className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <div
              className="prose prose-slate max-w-none"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: doc.contentHtml }}
            />
          </div>
        </details>
      </div>
    </section>
  );
}
