import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import EquipmentJsonLd from '@/app/components/content/EquipmentJsonLd';
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    return {
      title: 'Оборудование не найдено',
    };
  }

  const { data } = product;
  const title = String(data.title || slug);
  const description = String(data.description || '');
  const pageUrl = canonicalUrl(`/oborudovanie/${slug}`);
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
      images: coverImage ? [canonicalUrl(coverImage)] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return notFound();

  const { data, content } = product;
  const title = String(data.title || slug);
  const images = [data.coverImage, ...(Array.isArray(data.gallery) ? data.gallery : [])]
    .map((image) => (typeof image === 'string' ? image.trim() : ''))
    .filter(Boolean);
  const faq = Array.isArray(data.faq) ? data.faq : [];
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Оборудование', url: '/oborudovanie' },
          { name: title, url: `/oborudovanie/${slug}` },
        ]}
      />
      {faq.length > 0 ? <FaqJsonLd items={faq} /> : null}
      <EquipmentJsonLd
        name={title}
        description={typeof data.description === 'string' ? data.description : undefined}
        images={images}
        brand={typeof data.brand === 'string' ? data.brand : undefined}
        category={typeof data.category === 'string' ? data.category : undefined}
        model={typeof data.model === 'string' ? data.model : undefined}
        sku={typeof data.sku === 'string' ? data.sku : undefined}
        mpn={typeof data.mpn === 'string' ? data.mpn : undefined}
        gtin={typeof data.gtin === 'string' ? data.gtin : undefined}
        url={`/oborudovanie/${slug}`}
      />
      <ProductView data={data} content={content} />
    </>
  );
}
