import { absoluteUrl, getSiteUrl } from '@/app/config/site-url';

export type ArticleJsonLdProps = {
  title: string;
  description: string;
  url: string;
  dateModified?: string;
  image?: string;
};

function toAbsoluteUrl(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return absoluteUrl(trimmed);
}

export default function ArticleJsonLd({
  title,
  description,
  url,
  dateModified,
  image,
}: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: toAbsoluteUrl(url),
    mainEntityOfPage: toAbsoluteUrl(url),
    dateModified,
    image: image ? [toAbsoluteUrl(image)] : undefined,
    author: {
      '@type': 'Organization',
      name: 'РОСПАРК',
      url: getSiteUrl(),
    },
    publisher: {
      '@type': 'Organization',
      name: 'РОСПАРК',
      url: getSiteUrl(),
    },
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
