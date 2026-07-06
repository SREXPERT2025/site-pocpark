import { getSiteUrl } from '@/app/config/site-url';

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

/**
 * SSR-friendly JSON-LD разметка Organization на основе подтвержденных NAP/legal данных.
 */
export default function OrganizationJsonLd() {
  const siteUrl = getSiteUrl();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'РОСПАРК',
    legalName: 'Общество с ограниченной ответственностью «СР Эксперт»',
    alternateName: 'ООО «СР Эксперт»',
    url: normalizeBaseUrl(siteUrl),
    telephone: '+74993212040',
    email: 'is@srexpert.su',
    taxID: '5040100635',
    identifier: [
      {
        '@type': 'PropertyValue',
        name: 'ИНН',
        value: '5040100635',
      },
      {
        '@type': 'PropertyValue',
        name: 'ОГРН',
        value: '1105040005124',
      },
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+7 (499) 321-20-40',
        email: 'is@srexpert.su',
        contactType: 'sales',
        areaServed: 'RU',
        availableLanguage: 'Russian',
      },
      {
        '@type': 'ContactPoint',
        email: 'rav@srexpert.su',
        contactType: 'legal/privacy',
        areaServed: 'RU',
        availableLanguage: 'Russian',
      },
    ],
    address: {
      '@type': 'PostalAddress',
      postalCode: '123298',
      addressCountry: 'RU',
      addressLocality: 'Москва',
      streetAddress: 'ул. Народного ополчения, д.38к3, офис 117',
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
