import { getSiteUrl } from '@/app/config/site-url';

export type EquipmentJsonLdProps = {
  name: string;
  description?: string;
  images?: string[];
  brand?: string;
  category?: string;
  model?: string;
  sku?: string;
  mpn?: string;
  gtin?: string;
  url: string;
  baseUrl?: string;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function toAbsoluteUrl(baseUrl: string, url: string) {
  const trimmed = (url || '').trim();
  if (!trimmed) return normalizeBaseUrl(baseUrl);
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${normalizeBaseUrl(baseUrl)}${path}`;
}

/**
 * Описывает информационную страницу оборудования без заявки на товарный
 * rich-result. Публичных цен, отзывов и рейтингов на сайте нет, поэтому
 * Product/Offer разметка создавала в Google ложные обязательные поля.
 */
export default function EquipmentJsonLd(props: EquipmentJsonLdProps) {
  const siteUrl = props.baseUrl?.trim() || getSiteUrl();
  const name = props.name?.trim();
  if (!name) return null;

  const absUrl = toAbsoluteUrl(siteUrl, props.url);
  const images = (props.images || [])
    .map((image) => (image || '').trim())
    .filter(Boolean)
    .map((image) => toAbsoluteUrl(siteUrl, image));

  const identifiers = [
    props.model?.trim() ? { '@type': 'PropertyValue', name: 'Модель', value: props.model.trim() } : null,
    props.sku?.trim() ? { '@type': 'PropertyValue', name: 'Артикул', value: props.sku.trim() } : null,
    props.mpn?.trim() ? { '@type': 'PropertyValue', name: 'MPN', value: props.mpn.trim() } : null,
    props.gtin?.trim() ? { '@type': 'PropertyValue', name: 'GTIN', value: props.gtin.trim() } : null,
  ].filter(Boolean);

  const keywords = [props.brand, props.category, props.model]
    .map((keyword) => keyword?.trim())
    .filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description: props.description?.trim() || undefined,
    url: absUrl,
    keywords: keywords.length ? keywords : undefined,
    primaryImageOfPage: images[0]
      ? {
          '@type': 'ImageObject',
          url: images[0],
        }
      : undefined,
    about: {
      '@type': 'Thing',
      name,
      image: images.length ? images : undefined,
      identifier: identifiers.length ? identifiers : undefined,
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
