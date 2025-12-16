import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import CtaBlock from '@/app/components/ui/CtaBlock';
import { getAllContentMeta, getContentBySlug } from '@/lib/content-parser';

export function generateStaticParams() {
  return getAllContentMeta('vozmozhnosti').map((m) => ({ slug: m.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const data = getContentBySlug('vozmozhnosti', params.slug);
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
  };
}

export default function VozmozhnostiPage({ params }: { params: { slug: string } }) {
  const data = getContentBySlug('vozmozhnosti', params.slug);
  if (!data) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Возможности', href: '/vozmozhnosti' },
          { label: data.title },
        ]}
      />

      <Hero title={data.title} description={data.description} cta={{ label: 'Получить КП', href: '/quiz' }} />

      <div className="mt-10">
        <div className="md-content prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </div>

      {data.ctas?.length ? (
        <div className="mt-8">
          {data.ctas.map((cta, idx) => (
            <CtaBlock
               key={`${cta.href}-${idx}`}
               title={cta.label}
               description={cta.description}
               buttonText={cta.buttonText}
               href={cta.href}
            />

          ))}
        </div>
      ) : null}
    </div>
  );
}
