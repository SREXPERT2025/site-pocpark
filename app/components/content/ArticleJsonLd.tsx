import { absoluteUrl, getSiteUrl } from '@/app/config/site-url';

export type ArticleJsonLdProps = {
  title: string;
  description: string;
  url: string;
  datePublished: string;
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
  datePublished,
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
    datePublished,
    dateModified,
    image: image ? [toAbsoluteUrl(image)] : undefined,
    author: {
      '@type': 'Organization',
      name: 'Команда РОСПАРК',
      url: getSiteUrl(),
    },
    publisher: {
      '@type': 'Organization',
      name: 'ООО «СР Эксперт»',
      alternateName: 'РОСПАРК',
      url: getSiteUrl(),
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/logo.png'),
      },
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
