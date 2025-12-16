import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import GalleryBlock from '@/app/components/ui/GalleryBlock';
import TableBlock from '@/app/components/ui/TableBlock';
import { getAllContentMeta, getContentBySlug, type EquipmentFrontmatter } from '@/lib/content-parser';

export function generateStaticParams() {
  return getAllContentMeta('oborudovanie').map((m) => ({ slug: m.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const data = getContentBySlug<EquipmentFrontmatter>('oborudovanie', params.slug);
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
  };
}

export default function EquipmentPage({ params }: { params: { slug: string } }) {
  const data = getContentBySlug<EquipmentFrontmatter>('oborudovanie', params.slug);
  if (!data) notFound();

  const gallery = data.gallery ?? [];
  const specifications = data.specifications ?? [];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/oborudovanie' },
          { label: data.title },
        ]}
      />
      <Hero title={data.title} description={data.description} cta={{ label: 'Получить КП', href: '/quiz' }} />

      <GalleryBlock gallery={gallery} />
      <TableBlock specifications={specifications} />

      <div className="mt-section">
        <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">Описание</h2>
        <div className="mt-6 prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </div>
    </div>
  );
}
