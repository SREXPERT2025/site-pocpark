import { getSiteUrl } from '@/app/config/site-url';

export type ItemListEntry = {
  name: string;
  url: string;

  /** Доп. поля (опционально) — чтобы ItemList был понятнее ИИ и поиску */
  description?: string;
  image?: string;
};

export type ItemListJsonLdProps = {
  /** Заголовок коллекции, например «Оборудование РОСПАРК». */
  name: string;
  /** Список элементов в текущем порядке выдачи. */
  items: ItemListEntry[];
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
 * SSR-friendly JSON-LD разметка для страниц-каталогов (CollectionPage/ItemList).
 * Полезно для GEO/SEO: помогает понимать список страниц и их порядок, не
 * заявляя товарные предложения без подтвержденной публичной цены.
 */
export default function ItemListJsonLd({ name, items, baseUrl }: ItemListJsonLdProps) {
  if (!items || items.length === 0) return null;

  const siteUrl = baseUrl?.trim() || getSiteUrl();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: name.trim(),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items
        .filter((it) => it && it.name?.trim() && it.url?.trim())
        .map((it, idx) => {
          const absUrl = toAbsoluteUrl(siteUrl, it.url);
          const absImage = it.image ? toAbsoluteUrl(siteUrl, it.image) : undefined;

          const page = {
            '@type': 'WebPage',
            name: it.name.trim(),
            url: absUrl,
            ...(it.description?.trim() ? { description: it.description.trim() } : {}),
            ...(absImage
              ? { primaryImageOfPage: { '@type': 'ImageObject', url: absImage } }
              : {}),
          };

          return {
            '@type': 'ListItem',
            position: idx + 1,
            name: it.name.trim(),
            url: absUrl,
            item: page,
          };
        }),
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
