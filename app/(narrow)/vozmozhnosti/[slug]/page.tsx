import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import CtaBlock from '@/app/components/ui/CtaBlock';
import FeatureExplainerVisual from '@/app/components/content/FeatureExplainerVisual';
import TrustConversionBlocks from '@/app/components/content/TrustConversionBlocks';
import { canonicalUrl } from '@/app/config/site-url';
import { getAllContentMeta, getContentBySlug } from '@/lib/content-parser';

const featureVisuals: Record<string, { src: string; alt: string }> = {
  'arendnie-klienti': {
    src: '/images/features/explainers/arendnie-klienti.webp',
    alt: 'Инфографика РОСПАРК: доступ арендных клиентов по договорам, организациям и лимитам',
  },
  'gostevie-klienti': {
    src: '/images/features/explainers/gostevie-klienti.webp',
    alt: 'Инфографика РОСПАРК: гостевые клиенты, заявки, временный доступ и аудит событий',
  },
  'onlain-oplata': {
    src: '/images/content/online-payment.webp',
    alt: 'Инфографика РОСПАРК: онлайн-оплата парковки, QR-код, приложение, сайт и платёжные сценарии',
  },
  'raspoznavanie-nomerov': {
    src: '/images/content/license-plate-recognition.webp',
    alt: 'Инфографика РОСПАРК: распознавание номеров для парковки, доступ, оплата и контроль событий',
  },
};

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
