
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

      <section className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Следующий шаг
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">
            Выберите отдельное оборудование или связанный сценарий парковки
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Для замены одного узла можно перейти к нужной категории. Если требуется
            связать въезд, идентификацию, оплату и выезд, сначала зафиксируйте сценарий
            объекта — так состав оборудования не будет избыточным или неполным.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link
            href="/oborudovanie/shlagbaumy"
            className="rounded-xl border border-slate-200 bg-white p-5 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-700"
          >
            Подобрать шлагбаум для парковки
          </Link>
          <Link
            href="/stati/iz-chego-sostoit-parkovochnaya-sistema"
            className="rounded-xl border border-slate-200 bg-white p-5 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-700"
          >
            Разобраться в составе системы
          </Link>
          <Link
            href="/parkovka-pod-klyuch"
            className="rounded-xl border border-blue-200 bg-blue-50 p-5 font-semibold text-blue-800 transition hover:border-blue-400 hover:bg-blue-100"
          >
            Собрать парковку под задачу
          </Link>
        </div>
      </section>
    </section>
  );
}
