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
      itemListElement: items.map((it, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: it.url,
        item: {
          '@type': 'CaseStudy',
          name: it.name,
          ...(it.description ? { description: it.description } : {}),
          ...(it.image ? { image: it.image } : {}),
          ...(it.dateModified ? { dateModified: it.dateModified } : {}),
          url: it.url,
        },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
