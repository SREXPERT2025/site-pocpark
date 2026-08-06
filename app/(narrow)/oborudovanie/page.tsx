
import type { Metadata } from 'next';
import Link from 'next/link';
import EquipmentCatalogClient from './EquipmentCatalogClient';
import ItemListJsonLd from '@/app/components/content/ItemListJsonLd';
import { canonicalUrl } from '@/app/config/site-url';
import { getAllContentMeta } from '@/lib/content-parser';
import { getAllEquipment } from '@/lib/equipment';
import LandingEntryBanner from '@/app/components/landing/LandingEntryBanner';

export const metadata: Metadata = {
  title: 'Оборудование для автоматизации парковки',
  description:
    'Оборудование РОСПАРК для платной и закрытой парковки: шлагбаумы, стойки въезда и выезда, камеры, терминалы оплаты, табло и программное обеспечение.',
  alternates: {
    canonical: canonicalUrl('/oborudovanie'),
  },
  openGraph: {
    title: 'Оборудование для автоматизации парковки | РОСПАРК',
    description:
      'Оборудование для платной и закрытой парковки: въезд, идентификация, доступ, оплата и контроль.',
    url: canonicalUrl('/oborudovanie'),
    type: 'website',
  },
};

export default async function Page() {
  const items = await getAllEquipment();
  const contentItems = getAllContentMeta('oborudovanie');
  const jsonLdItems = contentItems.map((item) => ({
    name: item.title,
    description: item.description,
    url: `/oborudovanie/${item.slug}`,
    image: item.coverImage,
  }));

  return (
    <section className="container mx-auto px-4 py-16">
      <ItemListJsonLd name="Оборудование РОСПАРК" items={jsonLdItems} />

      <h1 className="text-4xl font-bold mb-5">Оборудование для автоматизации парковки</h1>
      <p className="max-w-4xl text-lg leading-relaxed text-slate-600">
        Для въезда используются шлагбаумы и парковочные стойки, для
        идентификации — камеры распознавания госномеров и карты доступа, для
        оплаты — терминалы и онлайн-оплата, для контроля — программное
        обеспечение, табло и периферия. Состав подбирается под задачу объекта.
      </p>
      <nav
        className="mb-10 mt-6 flex flex-wrap gap-3"
        aria-label="Основные категории парковочного оборудования"
      >
        <Link
          href="/oborudovanie/shlagbaumy"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-blue-500 hover:text-blue-700"
        >
          Шлагбаумы
        </Link>
        <Link
          href="/oborudovanie/stoika-rospark-standart-enter"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-blue-500 hover:text-blue-700"
        >
          Стойки въезда
        </Link>
        <Link
          href="/oborudovanie/stoika-rospark-standart-exit"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-blue-500 hover:text-blue-700"
        >
          Стойки выезда
        </Link>
        <Link
          href="/oborudovanie/terminal-oplati-rospark-standart"
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-blue-500 hover:text-blue-700"
        >
          Терминалы оплаты
        </Link>
      </nav>
      <LandingEntryBanner
        sourceSection="equipment_catalog"
        target="puzzle2"
        title="Сначала задача — потом состав оборудования"
        description="Расскажите, как должен работать объект. Мы поможем подобрать только те элементы системы, которые нужны для вашего сценария."
      />
      <EquipmentCatalogClient items={items} />
    </section>
  );
}
