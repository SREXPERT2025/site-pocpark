import { absoluteUrl } from '@/app/config/site-url';

export type CaseStudyListItem = {
  /** Название проекта */
  name: string;
  /** Короткое описание */
  description?: string;
  /** URL карточки проекта */
  url: string;
  /** Обложка */
  image?: string;
  /** Дата обновления (ISO) */
  dateModified?: string;
};

/**
 * Schema.org ItemList для списка проектов/кейсов.
 * Внутри каждого ListItem кладём CaseStudy (CreativeWork), чтобы ИИ корректно понимал листинг.
 */
export default function CaseStudyItemListJsonLd({
  name,
  description,
  items,
}: {
  name: string;
  description?: string;
  items: CaseStudyListItem[];
}) {
  if (!items?.length) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    ...(description ? { description } : {}),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((it, idx) => {
        const itemUrl = absoluteUrl(it.url);
        const imageUrl = it.image ? absoluteUrl(it.image) : undefined;

        return {
          '@type': 'ListItem',
          position: idx + 1,
          url: itemUrl,
          item: {
            '@type': 'CaseStudy',
            name: it.name,
            ...(it.description ? { description: it.description } : {}),
            ...(imageUrl ? { image: imageUrl } : {}),
            ...(it.dateModified ? { dateModified: it.dateModified } : {}),
            url: itemUrl,
          },
        };
      }),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
