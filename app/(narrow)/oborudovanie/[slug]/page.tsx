import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import ProductJsonLd from '@/app/components/content/ProductJsonLd';
import { canonicalUrl } from '@/app/config/site-url';
import { isPublishedContent } from '@/lib/content-parser';
import ProductView from './ProductView'; // Импортируем наш новый компонент

const contentDir = path.join(process.cwd(), 'content/oborudovanie');

function getProduct(slug: string) {
  const filePath = path.join(contentDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  if (!isPublishedContent(data)) return null;
  return { data: data as any, content };
}

export function generateStaticParams() {
  if (!fs.existsSync(contentDir)) return [];

  return fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith('.md'))
    .filter((file) => getProduct(file.replace(/\.md$/, '')) !== null)
    .map((file) => ({ slug: file.replace(/\.md$/, '') }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const product = getProduct(params.slug);

  if (!product) {
    return {
      title: 'Оборудование не найдено',
    };
  }

  const { data } = product;
  const title = String(data.title || params.slug);
  const description = String(data.description || '');
  const pageUrl = canonicalUrl(`/oborudovanie/${params.slug}`);
  const coverImage = typeof data.coverImage === 'string' ? data.coverImage : undefined;

  return {
    title: `${title} | Оборудование`,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      images: coverImage ? [coverImage] : undefined,
    },
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProduct(params.slug);
  if (!product) return notFound();

  const { data, content } = product;
  const title = String(data.title || params.slug);
  const images = [data.coverImage, ...(Array.isArray(data.gallery) ? data.gallery : [])]
    .map((image) => (typeof image === 'string' ? image.trim() : ''))
    .filter(Boolean);
  const faq = Array.isArray(data.faq) ? data.faq : [];
  const specifications = Array.isArray(data.specifications)
    ? data.specifications
        .map((spec: any) => {
          const name = typeof spec?.name === 'string' ? spec.name.trim() : '';
          const value = typeof spec?.value === 'string' ? spec.value.trim() : '';
          return name && value ? { name, value } : null;
        })
        .filter(Boolean)
    : [];

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Оборудование', url: '/oborudovanie' },
          { name: title, url: `/oborudovanie/${params.slug}` },
        ]}
      />
      {faq.length > 0 ? <FaqJsonLd items={faq} /> : null}
      <ProductJsonLd
        name={title}
        description={typeof data.description === 'string' ? data.description : undefined}
        images={images}
        brand={typeof data.brand === 'string' ? data.brand : undefined}
        category={typeof data.category === 'string' ? data.category : undefined}
        model={typeof data.model === 'string' ? data.model : undefined}
        sku={typeof data.sku === 'string' ? data.sku : undefined}
        mpn={typeof data.mpn === 'string' ? data.mpn : undefined}
        gtin={typeof data.gtin === 'string' ? data.gtin : undefined}
        url={`/oborudovanie/${params.slug}`}
        priceFrom={typeof data.priceFrom === 'number' ? data.priceFrom : undefined}
        currency={typeof data.currency === 'string' ? data.currency : undefined}
        availability={typeof data.availability === 'string' ? data.availability : undefined}
        condition={typeof data.condition === 'string' ? data.condition : undefined}
        specifications={specifications}
      />
      <ProductView data={data} content={content} />
    </>
  );
}
