export type ItemListEntry = {
  name: string;
  url: string;

  /** Доп. поля (опционально) — чтобы ItemList был понятнее ИИ и поиску */
  description?: string;
  image?: string;
  brand?: string;
  sku?: string;
  category?: string;
  priceFrom?: number;
  currency?: string;
  availability?: string; // InStock/OutOfStock/PreOrder
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

function schemaUrl(value?: string) {
  const v = String(value || '').trim();
  if (!v) return undefined;
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return `https://schema.org/${v}`;
}

function safePrice(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v) || v <= 0) return undefined;
  return v;
}

/**
 * SSR-friendly JSON-LD разметка для страниц-каталогов (CollectionPage/ItemList).
 * Полезно для GEO/SEO: помогает понимать список карточек и их порядок.
 */
export default function ItemListJsonLd({ name, items, baseUrl }: ItemListJsonLdProps) {
  if (!items || items.length === 0) return null;

  const siteUrl =
    baseUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://роспарк.рф';

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

          const price = safePrice(it.priceFrom);
          const currency = String(it.currency || '').trim() || undefined;
          const availability = schemaUrl(it.availability);

          const offer = price && currency
            ? {
                '@type': 'Offer',
                price,
                priceCurrency: currency,
                url: absUrl,
                ...(availability ? { availability } : {}),
              }
            : undefined;

          const product = {
            '@type': 'Product',
            name: it.name.trim(),
            url: absUrl,
            ...(it.description?.trim() ? { description: it.description.trim() } : {}),
            ...(absImage ? { image: [absImage] } : {}),
            ...(it.brand?.trim()
              ? { brand: { '@type': 'Brand', name: it.brand.trim() } }
              : {}),
            ...(it.sku?.trim() ? { sku: it.sku.trim() } : {}),
            ...(it.category?.trim() ? { category: it.category.trim() } : {}),
            ...(offer ? { offers: offer } : {}),
          };

          return {
            '@type': 'ListItem',
            position: idx + 1,
            name: it.name.trim(),
            url: absUrl,
            item: product,
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
