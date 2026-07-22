import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatOwnerInteger } from './owner-formatters';

type OwnerRegistryPagerProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  loading: boolean;
  label: string;
  onPageChange: (page: number) => void;
};

export default function OwnerRegistryPager({
  page,
  pageSize,
  total,
  totalPages,
  loading,
  label,
  onPageChange,
}: OwnerRegistryPagerProps) {
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = total ? Math.min(page * pageSize, total) : 0;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-slate-600">
        {total ? `${formatOwnerInteger(first)}–${formatOwnerInteger(last)} из ${formatOwnerInteger(total)}` : 'Нет записей'}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            const registry = event.currentTarget.closest('section');
            onPageChange(page - 1);
            window.requestAnimationFrame(() => registry?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
          }}
          disabled={loading || page <= 1 || totalPages === 0}
          className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={`Предыдущая страница: ${label}`}
        >
          <ChevronLeft aria-hidden="true" size={17} /> Назад
        </button>
        <span className="min-w-24 text-center font-semibold text-slate-700" aria-live="polite">
          {totalPages ? `${page} из ${totalPages}` : '0 страниц'}
        </span>
        <button
          type="button"
          onClick={(event) => {
            const registry = event.currentTarget.closest('section');
            onPageChange(page + 1);
            window.requestAnimationFrame(() => registry?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
          }}
          disabled={loading || totalPages === 0 || page >= totalPages}
          className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label={`Следующая страница: ${label}`}
        >
          Вперёд <ChevronRight aria-hidden="true" size={17} />
        </button>
      </div>
    </div>
  );
}
