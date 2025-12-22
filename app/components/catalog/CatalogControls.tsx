'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type CatalogSortKey = 'newest' | 'title_asc' | 'price_asc' | 'price_desc';

type CatalogControlsProps = {
  categories: string[];
  tags: string[];
  selectedCategory?: string;
  selectedTag?: string;
  selectedSort?: CatalogSortKey;
  query?: string;
};

function buildQueryString(
  current: URLSearchParams,
  updates: Record<string, string | undefined>
) {
  const next = new URLSearchParams(current.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value == null) {
      next.delete(key);
      return;
    }

    const trimmed = value.trim();

    if ((key === 'category' || key === 'tag') && (trimmed === '' || trimmed === 'all')) {
      next.delete(key);
      return;
    }

    if (key === 'q' && trimmed === '') {
      next.delete(key);
      return;
    }

    next.set(key, trimmed);
  });

  const qs = next.toString();
  return qs ? `?${qs}` : '';
}

export default function CatalogControls({
  categories,
  tags,
  selectedCategory,
  selectedTag,
  selectedSort,
  query,
}: CatalogControlsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const normalizedCategories = useMemo(() => {
    return Array.from(new Set(categories.map((c) => c.trim()).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, 'ru')
    );
  }, [categories]);

  const normalizedTags = useMemo(() => {
    return Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'ru')
    );
  }, [tags]);

  const currentCategory = selectedCategory || 'all';
  const currentTag = selectedTag || 'all';
  const currentSort = selectedSort || 'newest';

  const [searchValue, setSearchValue] = useState(query || '');

  // Синхронизация, если пользователь перешёл по ссылке с другими params
  useEffect(() => {
    setSearchValue(query || '');
  }, [query]);

  // Debounce: чтобы не дергать роутер на каждый символ
  useEffect(() => {
    const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const currentQ = sp.get('q') || '';
    if (currentQ.trim() === searchValue.trim()) return;

    const t = setTimeout(() => {
      const qs = buildQueryString(sp, { q: searchValue });
      router.replace(`${pathname}${qs}`);
    }, 250);

    return () => clearTimeout(t);
  }, [searchValue, pathname, router]);

  return (
    <div className="mt-section rounded-md border border-border-primary bg-bg-primary p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <div className="text-sm font-medium text-text-primary">Поиск</div>
          <input
            className="mt-2 w-full rounded-md border border-border-primary bg-white px-3 py-2 text-sm"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Название, описание, категория, теги"
            inputMode="search"
          />
          <div className="mt-1 text-xs text-text-secondary">
            Ищет по: названию, описанию, категории и тегам.
          </div>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-text-primary">Категория</div>
          <select
            className="mt-2 w-full rounded-md border border-border-primary bg-white px-3 py-2 text-sm"
            value={currentCategory}
            onChange={(e) => {
              const sp = new URLSearchParams(window.location.search);
              const qs = buildQueryString(sp, {
                category: e.target.value,
              });
              router.push(`${pathname}${qs}`);
            }}
          >
            <option value="all">Все категории</option>
            {normalizedCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-text-primary">Тег</div>
          <select
            className="mt-2 w-full rounded-md border border-border-primary bg-white px-3 py-2 text-sm"
            value={currentTag}
            onChange={(e) => {
              const sp = new URLSearchParams(window.location.search);
              const qs = buildQueryString(sp, { tag: e.target.value });
              router.push(`${pathname}${qs}`);
            }}
          >
            <option value="all">Все теги</option>
            {normalizedTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium text-text-primary">Сортировка</div>
          <select
            className="mt-2 w-full rounded-md border border-border-primary bg-white px-3 py-2 text-sm"
            value={currentSort}
            onChange={(e) => {
              const sp = new URLSearchParams(window.location.search);
              const qs = buildQueryString(sp, { sort: e.target.value });
              router.push(`${pathname}${qs}`);
            }}
          >
            <option value="newest">Сначала новые</option>
            <option value="title_asc">По названию (А → Я)</option>
            <option value="price_asc">По цене (↑)</option>
            <option value="price_desc">По цене (↓)</option>
          </select>
        </label>

        <div className="lg:col-span-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-text-secondary">
            Подсказка: фильтры и поиск сохраняются в URL — можно отправить ссылку коллеге.
          </div>
          <button
            type="button"
            className="rounded-md border border-border-primary bg-bg-primary px-4 py-2 text-sm font-medium text-text-primary hover:bg-white"
            onClick={() => router.push(pathname)}
          >
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );
}
