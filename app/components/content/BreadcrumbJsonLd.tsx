export type BreadcrumbItem = {
  /** Название шага (например, «Главная», «Решения для ТЦ»). */
  name: string;
  /** URL шага (можно относительный: /contacts). */
  url: string;
};

export type BreadcrumbJsonLdProps = {
  items: BreadcrumbItem[];
  /** Базовый URL сайта. Если не задан — берём из NEXT_PUBLIC_SITE_URL или fallback. */
  baseUrl?: string;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function toAbsoluteUrl(baseUrl: string, url: string) {
  const trimmed = url.trim();
  if (!trimmed) return normalizeBaseUrl(baseUrl);

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${normalizeBaseUrl(baseUrl)}${path}`;
}

/**
 * SSR-friendly JSON-LD разметка BreadcrumbList.
 * Важно для GEO/SEO: помогает ассистентам и поисковикам понимать иерархию страницы.
 */
export default function BreadcrumbJsonLd({ items, baseUrl }: BreadcrumbJsonLdProps) {
  if (!items || items.length < 2) return null;

  const siteUrl =
    baseUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://роспарк.рф';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
      .filter((it) => it && it.name?.trim() && it.url?.trim())
      .map((it, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: it.name.trim(),
        item: toAbsoluteUrl(siteUrl, it.url),
      })),
  };

  if (!jsonLd.itemListElement || jsonLd.itemListElement.length < 2) return null;

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
