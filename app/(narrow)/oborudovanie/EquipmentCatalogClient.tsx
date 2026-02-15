
'use client';
import { useState, useMemo } from 'react';
import EquipmentCard from '@/app/components/catalog/EquipmentCard';

const FILTERS = [
  { label: 'Все оборудование', value: 'all' },
  { label: 'Парковочные стойки', value: 'posts' },
  { label: 'Терминалы оплаты парковки', value: 'terminal' },
  { label: 'Шлагбаумы', value: 'barrier' },
  { label: 'Информационные табло', value: 'display' },
  { label: 'Системы распознавания номеров', value: 'anpr' },
  { label: 'Светофоры', value: 'traffic' },
];

export default function EquipmentCatalogClient({ items }) {
  const [active, setActive] = useState('all');

  const filtered = useMemo(() => {
    if (active === 'all') return items;
    if (active === 'posts') return items.filter(i => ['entry-post','exit-post'].includes(i.category));
    return items.filter(i => i.category === active);
  }, [active, items]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-3">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setActive(f.value)}
            className={active===f.value?'bg-black text-white rounded-full px-5 py-2':'border rounded-full px-5 py-2'}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length===0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center text-gray-500">
          В этом разделе оборудование пока не добавлено
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {filtered.map(item => <EquipmentCard key={item.slug} {...item} />)}
        </div>
      )}
    </div>
  );
}
