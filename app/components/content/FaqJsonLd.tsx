export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqJsonLdProps = {
  /** Список FAQ для разметки Schema.org FAQPage */
  items: FaqItem[];
};

/**
 * SSR-friendly JSON-LD разметка FAQPage.
 * Важно для GEO/SEO: скрипт рендерится на сервере, без client JS.
 */
export default function FaqJsonLd({ items }: FaqJsonLdProps) {
  if (!items || items.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question.trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
