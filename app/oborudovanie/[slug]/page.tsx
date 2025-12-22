import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import GalleryBlock from '@/app/components/ui/GalleryBlock';
import TableBlock from '@/app/components/ui/TableBlock';
import ListBlock from '@/app/components/ui/ListBlock';
import DownloadsBlock from '@/app/components/ui/DownloadsBlock';
import FaqBlock from '@/app/components/ui/FaqBlock';
import ProductCard from '@/app/components/ui/ProductCard';
import AnswerFirst from '@/app/components/content/AnswerFirst';
import ExtendedInfo from '@/app/components/content/ExtendedInfo';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ProductJsonLd from '@/app/components/content/ProductJsonLd';
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
  const packageContents = data.packageContents ?? [];
  const downloads = data.downloads ?? [];
  const faq = data.faq ?? [];
  const answerFirst = data.answerFirst;

  const breadcrumbs = [
    { label: 'Главная', href: '/' },
    { label: 'Оборудование', href: '/oborudovanie' },
    { label: data.title },
  ];

  const breadcrumbsSchema = [
    { name: 'Главная', url: '/' },
    { name: 'Оборудование', url: '/oborudovanie' },
    { name: data.title, url: `/oborudovanie/${params.slug}` },
  ];

  const images = gallery.length
    ? gallery
    : data.coverImage
      ? [data.coverImage]
      : [];

  // --- Похожие товары (по категории + пересечению тегов) ---
  const allMeta = getAllContentMeta('oborudovanie');
  const currentCategory = (data.category || '').trim();
  const currentTags = Array.isArray(data.tags)
    ? data.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  const related = allMeta
    .filter((m) => m.slug !== params.slug)
    .map((m) => {
      const mCategory = (m.category || '').trim();
      const mTags = Array.isArray(m.tags) ? m.tags : [];

      let score = 0;
      if (currentCategory && mCategory && currentCategory === mCategory) score += 3;

      if (currentTags.length && mTags.length) {
        const set = new Set(currentTags.map((t) => t.toLowerCase()));
        const overlap = mTags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .filter((t) => set.has(t.toLowerCase())).length;
        score += Math.min(overlap, 3) * 2;
      }

      const modified = Date.parse(m.lastModified || '') || 0;
      return { meta: m, score, modified };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => (b.score - a.score) || (b.modified - a.modified))
    .slice(0, 3)
    .map((x) => x.meta);

  return (
    <div>
      {/* Schema: Breadcrumbs + Product + FAQ (SSR) */}
      <BreadcrumbJsonLd items={breadcrumbsSchema} />
      <ProductJsonLd
        name={data.title}
        description={data.description}
        images={images}
        brand={data.brand}
        category={data.category}
        model={data.model}
        sku={data.sku}
        mpn={data.mpn}
        gtin={data.gtin}
        url={`/oborudovanie/${params.slug}`}
        priceFrom={data.priceFrom}
        currency={data.currency}
        availability={data.availability}
        condition={data.condition}
      />
      <FaqJsonLd items={faq} />

      <Breadcrumbs items={breadcrumbs} />
      <Hero title={data.title} description={data.description} cta={{ label: 'Получить КП', href: '/quiz' }} />

      {answerFirst?.lead ? (
        <div className="mt-section">
          <AnswerFirst lead={answerFirst.lead} bullets={answerFirst.bullets || []} />
        </div>
      ) : null}

      <GalleryBlock gallery={gallery} />
      <TableBlock specifications={specifications} />
      <ListBlock title="Комплектация" items={packageContents} />
      <DownloadsBlock title="Документы" items={downloads} />

      <div className="mt-section">
        <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">Описание</h2>
        <div className="mt-6 prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </div>

      <FaqBlock title="Вопросы и ответы" items={faq} />

      {/* Расширенная информация (MD) — глубокие детали для SEO/GEO без перегруза карточки */}
      <ExtendedInfo section="oborudovanie" slug={params.slug} summaryLabel="Расширенная информация" className="mt-section" />

      <LeadFormSection
        className="mt-section"
        sourceSection="equipment_item"
        title="Запросить КП на оборудование"
        description="Оставьте контакты — уточним комплектацию, сроки и стоимость поставки/монтажа."
        submitLabel="Получить КП"
      />

      {/* Похожие товары — помогает пользователю ориентироваться в каталоге */}
      <section className="mt-section">
        <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">Похожие товары</h2>

        {related.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            Пока нет похожих позиций. Добавьте ещё товары в <code>content/oborudovanie</code> — и здесь автоматически появятся рекомендации.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((m) => (
              <ProductCard
                key={m.slug}
                href={`/oborudovanie/${m.slug}`}
                title={m.title}
                description={m.description}
                coverImage={m.coverImage}
                category={m.category}
                tags={m.tags}
                priceFrom={m.priceFrom}
                currency={m.currency}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
