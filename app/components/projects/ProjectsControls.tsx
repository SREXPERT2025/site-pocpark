'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type ProjectsSortKey = 'title_asc' | 'title_desc';

type Props = {
  categories: string[];
  selectedCategory?: string;
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
  categories,
  selectedCategory,
  selectedSort = 'title_asc',
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'Все типы объектов' },
      ...(categories ?? []).map((category) => ({
        value: category,
        label: category,
      })),
    ],
    [categories]
  );

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
            Тип объекта
          </label>
          <select
            className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            value={selectedCategory ?? 'all'}
            onChange={(e) => onChange({ category: e.target.value })}
          >
            {categoryOptions.map((o) => (
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
            <option value="title_asc">По названию (А→Я)</option>
            <option value="title_desc">По названию (Я→А)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
