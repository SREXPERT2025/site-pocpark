
import type { Metadata } from 'next';
import EquipmentCatalogClient from './EquipmentCatalogClient';
import ItemListJsonLd from '@/app/components/content/ItemListJsonLd';
import { canonicalUrl } from '@/app/config/site-url';
import { getAllContentMeta } from '@/lib/content-parser';
import { getAllEquipment } from '@/lib/equipment';

export const metadata: Metadata = {
  title: 'Оборудование для автоматизации парковки',
  description:
    'Каталог оборудования РОСПАРК для автоматизации парковок: стойки въезда и выезда, шлагбаумы, терминалы оплаты, табло и светофоры.',
  alternates: {
    canonical: canonicalUrl('/oborudovanie'),
  },
  openGraph: {
    title: 'Оборудование для автоматизации парковки | РОСПАРК',
    description:
      'Оборудование подбирается под объект: въезд, выезд, оплата, распознавание номеров, табло и управление доступом.',
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
    brand: item.brand,
    sku: item.sku,
    category: item.category,
    priceFrom: item.priceFrom,
    currency: item.currency,
    availability: item.availability,
  }));

  return (
    <section className="container mx-auto px-4 py-16">
      <ItemListJsonLd name="Оборудование РОСПАРК" items={jsonLdItems} />

      <h1 className="text-4xl font-bold mb-5">Оборудование для автоматизации парковки</h1>
      <p className="mb-10 max-w-3xl text-lg leading-relaxed text-slate-600">
        Оборудование подбирается под объект: въезд, выезд, оплата, распознавание номеров, табло и управление доступом.
      </p>
      <EquipmentCatalogClient items={items} />
    </section>
  );
}
