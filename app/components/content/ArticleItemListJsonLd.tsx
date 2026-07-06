import { absoluteUrl } from '@/app/config/site-url';

export type ArticleListItem = {
  title: string;
  description: string;
  url: string;
  image?: string;
  dateModified?: string;
};

function toAbsoluteUrl(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return absoluteUrl(trimmed);
}

export default function ArticleItemListJsonLd({
  name,
  items,
}: {
  name: string;
  items: ArticleListItem[];
}) {
  if (!items.length) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.title,
        url: toAbsoluteUrl(item.url),
        item: {
          '@type': 'Article',
          headline: item.title,
          description: item.description,
          url: toAbsoluteUrl(item.url),
          image: item.image ? [toAbsoluteUrl(item.image)] : undefined,
          dateModified: item.dateModified,
        },
      })),
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
