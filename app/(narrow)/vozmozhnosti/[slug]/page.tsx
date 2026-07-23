import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import CtaBlock from '@/app/components/ui/CtaBlock';
import DemoCommercialCallout from '@/app/components/demo/DemoCommercialCallout';
import FeatureExplainerVisual from '@/app/components/content/FeatureExplainerVisual';
import TrustConversionBlocks from '@/app/components/content/TrustConversionBlocks';
import { canonicalUrl } from '@/app/config/site-url';
import { getAllContentMeta, getContentBySlug } from '@/lib/content-parser';

const featureVisuals: Record<string, { src: string; alt: string }> = {
  'onlain-oplata': {
    src: '/images/content/rospark-features-payment-anpr.webp',
    alt: 'Схема РОСПАРК: идентификация автомобиля, безналичная оплата и автоматический выезд',
  },
  'raspoznavanie-nomerov': {
    src: '/images/vozmozhnosti/vozmozhnosti-postoyannye-videoraspaznavanie.webp',
    alt: 'Камера распознаёт номер автомобиля перед автоматическим проездом через шлагбаум',
  },
};

const demoRelevantFeatures = new Set([
  'arendnie-klienti',
  'gostevie-klienti',
  'onlain-oplata',
]);

export function generateStaticParams() {
  return getAllContentMeta('vozmozhnosti').map((m) => ({ slug: m.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const data = getContentBySlug('vozmozhnosti', params.slug);
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: canonicalUrl(`/vozmozhnosti/${params.slug}`),
    },
    openGraph: {
      title: data.title,
      description: data.description,
      url: canonicalUrl(`/vozmozhnosti/${params.slug}`),
      type: 'website',
      images: data.coverImage ? [canonicalUrl(data.coverImage)] : undefined,
    },
  };
}

export default function VozmozhnostiPage({ params }: { params: { slug: string } }) {
  const data = getContentBySlug('vozmozhnosti', params.slug);
  if (!data) notFound();
  const visual = featureVisuals[params.slug];

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

      {visual ? <FeatureExplainerVisual src={visual.src} alt={visual.alt} /> : null}

      <div className="mt-10">
        <div className="md-content prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </div>

      <div className="mt-12">
        <TrustConversionBlocks variant="features" />
      </div>

      {demoRelevantFeatures.has(params.slug) ? <DemoCommercialCallout /> : null}

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
