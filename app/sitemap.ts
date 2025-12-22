import type { MetadataRoute } from 'next';
import { getAllContentMeta } from '@/lib/content-parser';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rospark.rf';

/**
 * Sitemap ориентирован на индексацию (SEO/GEO):
 * - Добавляет ключевые статические коммерческие страницы (TSX)
 * - Добавляет контентные страницы из /content (MD)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Статические страницы (TSX) из Sitemap v1.1
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now },
    { url: `${SITE_URL}/contacts`, lastModified: now },
    { url: `${SITE_URL}/oborudovanie`, lastModified: now },
    { url: `${SITE_URL}/keysy`, lastModified: now },
    { url: `${SITE_URL}/vozmozhnosti`, lastModified: now },
    { url: `${SITE_URL}/quiz`, lastModified: now },

    // Решения (коммерческие страницы на TSX)
    { url: `${SITE_URL}/resheniya/dlya-rukovoditeley`, lastModified: now },
    { url: `${SITE_URL}/resheniya/dlya-inzhenerov`, lastModified: now },
    { url: `${SITE_URL}/resheniya/dlya-sluzhby-bezopasnosti`, lastModified: now },
    { url: `${SITE_URL}/resheniya/torgovye-centry`, lastModified: now },
    { url: `${SITE_URL}/resheniya/biznes-centry`, lastModified: now },
    { url: `${SITE_URL}/resheniya/zastroyschiki`, lastModified: now },

    // Обзорные страницы (TSX, не в меню, но полезны для индексации / AI)
    { url: `${SITE_URL}/resheniya/sravnenie-podhodov`, lastModified: now },
  ];

  // Контентные страницы из /content (MD)
  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...getAllContentMeta('resheniya').map((m) => ({
      url: `${SITE_URL}/resheniya/${m.slug}`,
      lastModified: m.lastModified ? new Date(m.lastModified) : now,
    })),
    ...getAllContentMeta('vozmozhnosti').map((m) => ({
      url: `${SITE_URL}/vozmozhnosti/${m.slug}`,
      lastModified: m.lastModified ? new Date(m.lastModified) : now,
    })),
    ...getAllContentMeta('oborudovanie').map((m) => ({
      url: `${SITE_URL}/oborudovanie/${m.slug}`,
      lastModified: m.lastModified ? new Date(m.lastModified) : now,
    })),
    ...getAllContentMeta('keysy').map((m) => ({
      url: `${SITE_URL}/keysy/${m.slug}`,
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
