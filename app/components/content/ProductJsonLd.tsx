export type ProductJsonLdProps = {
  /** Название товара */
  name: string;
  /** Короткое описание (1–2 предложения) */
  description?: string;
  /** Изображения (относительные или абсолютные URL) */
  images?: string[];
  /** Бренд */
  brand?: string;
  /** Категория */
  category?: string;
  /** Модель */
  model?: string;
  /** SKU (артикул) */
  sku?: string;
  /** MPN (производственный артикул), опционально */
  mpn?: string;
  /** GTIN/EAN, опционально */
  gtin?: string;
  /** URL страницы товара (относительный или абсолютный) */
  url: string;
  /** Цена «от». Если 0/не задано — «по запросу» */
  priceFrom?: number;
  /** Валюта, например RUB */
  currency?: string;
  /** Наличие: InStock | OutOfStock | PreOrder */
  availability?: string;
  /** Состояние: NewCondition | UsedCondition | RefurbishedCondition */
  condition?: string;
  /** Базовый URL сайта. Если не задан — берём из NEXT_PUBLIC_SITE_URL или fallback. */
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

function availabilityUrl(value?: string) {
  const v = String(value || 'InStock').trim();
  // Schema.org ожидает абсолютный URL значения
  return `https://schema.org/${v}`;
}

function conditionUrl(value?: string) {
  const v = String(value || 'NewCondition').trim();
  return `https://schema.org/${v}`;
}

/**
 * SSR-friendly JSON-LD разметка Product (+ Offer при наличии цены).
 * Важно для GEO/SEO: даёт ассистентам структуру товара (бренд/артикул/наличие/цена).
 */
export default function ProductJsonLd(props: ProductJsonLdProps) {
  const siteUrl =
    props.baseUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://роспарк.рф';

  const name = props.name?.trim();
  if (!name) return null;

  const absUrl = toAbsoluteUrl(siteUrl, props.url);
  const images = (props.images || [])
    .map((i) => (i || '').trim())
    .filter(Boolean)
    .map((i) => toAbsoluteUrl(siteUrl, i));

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: (props.description || '').trim() || undefined,
    image: images.length ? images : undefined,
    category: props.category?.trim() || undefined,
    model: props.model?.trim() || undefined,
    sku: props.sku?.trim() || undefined,
    mpn: props.mpn?.trim() || undefined,
    brand: props.brand?.trim()
      ? {
          '@type': 'Brand',
          name: props.brand.trim(),
        }
      : undefined,
    url: absUrl,
  };

  const gtin = (props.gtin || '').trim();
  if (gtin) {
    // Если это похоже на gtin13 (13 цифр) — кладём в gtin13, иначе в общий gtin
    const onlyDigits = /^\d+$/.test(gtin);
    if (onlyDigits && gtin.length === 13) jsonLd.gtin13 = gtin;
    else if (onlyDigits && gtin.length === 14) jsonLd.gtin14 = gtin;
    else jsonLd.gtin = gtin;
  }

  // Offer: если цена не задана/0 — считаем «по запросу» и не указываем price
  const priceFrom = Number(props.priceFrom || 0);
  const currency = (props.currency || '').trim();

  const offer: any = {
    '@type': 'Offer',
    url: absUrl,
    availability: availabilityUrl(props.availability),
    itemCondition: conditionUrl(props.condition),
  };

  if (priceFrom > 0 && currency) {
    offer.price = priceFrom;
    offer.priceCurrency = currency;
  } else if (currency) {
    // Валюту можно оставить как подсказку, даже если цена «по запросу»
    offer.priceCurrency = currency;
  }

  jsonLd.offers = offer;

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
