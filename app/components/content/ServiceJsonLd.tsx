import { getSiteUrl } from '@/app/config/site-url';

export type ServiceJsonLdProps = {
  name: string;
  description: string;
  url: string;
  serviceType: string;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function toAbsoluteUrl(baseUrl: string, url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${normalizeBaseUrl(baseUrl)}${url.startsWith('/') ? url : `/${url}`}`;
}

/**
 * Описывает подтверждённую видимым содержанием услугу без цен и Offer.
 */
export default function ServiceJsonLd({
  name,
  description,
  url,
  serviceType,
}: ServiceJsonLdProps) {
  const siteUrl = getSiteUrl();
  const providerUrl = normalizeBaseUrl(siteUrl);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType,
    url: toAbsoluteUrl(siteUrl, url),
    provider: {
      '@type': 'Organization',
      name: 'РОСПАРК',
      url: providerUrl,
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
