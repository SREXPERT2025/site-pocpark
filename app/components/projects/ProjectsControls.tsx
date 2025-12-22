'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type ProjectsSortKey = 'newest' | 'title_asc';

type Props = {
  formats: string[]; // ['text','video']
  selectedFormat?: string;
  selectedSort?: ProjectsSortKey;
};

function buildQueryString(
  current: URLSearchParams,
  updates: Record<string, string | undefined>
) {
  const next = new URLSearchParams(current.toString());
  Object.entries(updates).forEach(([k, v]) => {
    if (!v || v === 'all') next.delete(k);
    else next.set(k, v);
  });
  const qs = next.toString();
  return qs ? `?${qs}` : '';
}

export default function ProjectsControls({
  formats,
  selectedFormat,
  selectedSort = 'newest',
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const formatOptions = useMemo(() => {
    const base = [{ value: 'all', label: 'Все' }];
    const mapped = (formats ?? []).map((f) => ({
      value: f,
      label: f === 'video' ? 'Видео' : f === 'text' ? 'Текст' : f,
    }));
    return [...base, ...mapped];
  }, [formats]);

  function onChange(updates: Record<string, string | undefined>) {
    const current =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const qs = buildQueryString(current, updates);
    router.replace(`${pathname}${qs}`);
  }

  return (
    <div className="mt-10 rounded-2xl border border-border bg-white p-4 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-text-secondary">
            Формат
          </label>
          <select
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            value={selectedFormat ?? 'all'}
            onChange={(e) => onChange({ format: e.target.value })}
          >
            {formatOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary">
            Сортировка
          </label>
          <select
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            value={selectedSort}
            onChange={(e) => onChange({ sort: e.target.value })}
          >
            <option value="newest">Сначала новые</option>
            <option value="title_asc">По названию (А→Я)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
