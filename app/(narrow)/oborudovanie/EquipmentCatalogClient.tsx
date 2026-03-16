'use client';

import { useMemo, useState } from 'react';
import EquipmentCard from '@/app/components/catalog/EquipmentCard';

type EquipmentItem = {
  slug: string;
  title: string;
  description?: string;
  price?: string;
  image: string;
  category: string;
};

type EquipmentCatalogClientProps = {
  items: EquipmentItem[];
};

const FILTERS = [
  { label: 'Все оборудование', value: 'all' },
  { label: 'Парковочные стойки', value: 'posts' },
  { label: 'Терминалы оплаты парковки', value: 'terminal' },
  { label: 'Шлагбаумы', value: 'barrier' },
  { label: 'Информационные табло', value: 'display' },
  { label: 'Системы распознавания номеров', value: 'anpr' },
  { label: 'Светофоры', value: 'traffic' },
] as const;

export default function EquipmentCatalogClient({
  items,
}: EquipmentCatalogClientProps) {
  const [active, setActive] = useState<(typeof FILTERS)[number]['value']>('all');

  const filtered = useMemo(() => {
    if (active === 'all') return items;

    if (active === 'posts') {
      return items.filter((item) =>
        ['entry-post', 'exit-post'].includes(item.category)
      );
    }

    return items.filter((item) => item.category === active);
  }, [active, items]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((filter) => {
          const isActive = active === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActive(filter.value)}
              className={[
                'rounded-full px-5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-black text-white'
                  : 'border border-gray-300 bg-white text-black hover:border-black',
              ].join(' ')}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          В этом разделе оборудование пока не добавлено
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <EquipmentCard key={item.slug} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}