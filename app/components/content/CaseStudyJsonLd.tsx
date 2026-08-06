import { absoluteUrl, getSiteUrl } from '@/app/config/site-url';

export type CaseStudyJsonLdProps = {
  title: string;
  description: string;
  url: string;
  dateModified?: string;
  image?: string;
  category?: string;
  tags?: string[];
  customer?: string;
  city?: string;
  region?: string;
  objectType?: string;
  equipment?: string[];
  metrics?: { label: string; value: string }[];
};

function toAbsoluteUrl(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return absoluteUrl(trimmed);
}

function toIsoDate(value?: string) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Date(timestamp).toISOString();
}

export default function CaseStudyJsonLd({
  title,
  description,
  url,
  dateModified,
  image,
  category,
  tags,
  customer,
  city,
  region,
  objectType,
  equipment,
  metrics,
}: CaseStudyJsonLdProps) {
  const pageUrl = toAbsoluteUrl(url);
  const about = [
    ...(customer ? [customer] : []),
    ...(objectType ? [objectType] : []),
    ...(category ? [category] : []),
    ...(tags ?? []),
    ...(equipment ?? []),
  ]
    .map((item) => item.trim())
    .filter((item, index, items) => Boolean(item) && items.indexOf(item) === index);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CaseStudy',
    name: title,
    headline: title,
    description,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    dateModified: toIsoDate(dateModified),
    image: image ? [toAbsoluteUrl(image)] : undefined,
    spatialCoverage:
      city || region
        ? {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: city,
              addressRegion: region,
              addressCountry: 'RU',
            },
          }
        : undefined,
    about: about.length
      ? about.map((name) => ({
          '@type': 'Thing',
          name,
        }))
      : undefined,
    provider: {
      '@type': 'Organization',
      name: 'РОСПАРК',
      legalName: 'ООО «СР Эксперт»',
      url: getSiteUrl(),
    },
    publisher: {
      '@type': 'Organization',
      name: 'ООО «СР Эксперт»',
      alternateName: 'РОСПАРК',
      url: getSiteUrl(),
    },
    variableMeasured: metrics?.length
      ? metrics.map((metric) => ({
          '@type': 'PropertyValue',
          name: metric.label,
          value: metric.value,
        }))
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
