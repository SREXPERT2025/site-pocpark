import type { MetadataRoute } from 'next';
import { getAllContentMeta } from '@/lib/content-parser';
import { absoluteUrl } from '@/app/config/site-url';

/**
 * Sitemap ориентирован на индексацию (SEO/GEO):
 * - Добавляет ключевые статические коммерческие страницы (TSX)
 * - Добавляет контентные страницы из /content (MD)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Статические страницы (TSX) из Sitemap v1.1
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now },
    { url: absoluteUrl('/o-kompanii'), lastModified: now },
    { url: absoluteUrl('/contacts'), lastModified: now },
    { url: absoluteUrl('/oborudovanie'), lastModified: now },
    { url: absoluteUrl('/keysy'), lastModified: now },
    { url: absoluteUrl('/stati'), lastModified: now },
    { url: absoluteUrl('/vozmozhnosti'), lastModified: now },
    { url: absoluteUrl('/quiz'), lastModified: now },
    { url: absoluteUrl('/privacy'), lastModified: now },
    { url: absoluteUrl('/soglasie-na-obrabotku-personalnyh-dannyh'), lastModified: now },

    // Решения (коммерческие страницы на TSX)
    { url: absoluteUrl('/resheniya/dlya-rukovoditeley'), lastModified: now },
    { url: absoluteUrl('/resheniya/dlya-inzhenerov'), lastModified: now },
    { url: absoluteUrl('/resheniya/dlya-sluzhby-bezopasnosti'), lastModified: now },
    { url: absoluteUrl('/resheniya/torgovye-centry'), lastModified: now },
    { url: absoluteUrl('/resheniya/biznes-centry'), lastModified: now },
    { url: absoluteUrl('/resheniya/skladskie-kompleksy'), lastModified: now },
    { url: absoluteUrl('/resheniya/zastroyschiki'), lastModified: now },

    // Обзорные страницы (TSX, не в меню, но полезны для индексации / AI)
    { url: absoluteUrl('/resheniya/sravnenie-podhodov'), lastModified: now },
  ];

  // Контентные страницы из /content (MD)
  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...getAllContentMeta('resheniya').map((m) => ({
      url: absoluteUrl(`/resheniya/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : now,
    })),
    ...getAllContentMeta('vozmozhnosti').map((m) => ({
      url: absoluteUrl(`/vozmozhnosti/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : now,
    })),
    ...getAllContentMeta('oborudovanie').map((m) => ({
      url: absoluteUrl(`/oborudovanie/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : now,
    })),
    ...getAllContentMeta('keysy').map((m) => ({
      url: absoluteUrl(`/keysy/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : now,
    })),
    ...getAllContentMeta('stati').map((m) => ({
      url: absoluteUrl(`/stati/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : now,
    })),
  ];

  // Убираем дубликаты на всякий случай
  const unique = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const item of [...staticRoutes, ...dynamicRoutes]) {
    unique.set(item.url, item);
  }
  return Array.from(unique.values());
}
