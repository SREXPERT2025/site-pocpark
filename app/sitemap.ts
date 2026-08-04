import type { MetadataRoute } from 'next';
import { getAllContentMeta } from '@/lib/content-parser';
import { absoluteUrl } from '@/app/config/site-url';

/**
 * Sitemap ориентирован на индексацию (SEO/GEO):
 * - Добавляет ключевые статические коммерческие страницы (TSX)
 * - Добавляет контентные страницы из /content (MD)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Статические страницы (TSX) из Sitemap v1.1
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/') },
    { url: absoluteUrl('/o-kompanii') },
    { url: absoluteUrl('/contacts') },
    { url: absoluteUrl('/demo') },
    { url: absoluteUrl('/oborudovanie') },
    { url: absoluteUrl('/keysy') },
    { url: absoluteUrl('/stati') },
    { url: absoluteUrl('/vozmozhnosti') },
    { url: absoluteUrl('/resheniya') },
    { url: absoluteUrl('/privacy') },
    { url: absoluteUrl('/soglasie-na-obrabotku-personalnyh-dannyh') },
    { url: absoluteUrl('/parkovka') },
    { url: absoluteUrl('/parkovka-pod-klyuch') },

    // Решения (коммерческие страницы на TSX)
    { url: absoluteUrl('/resheniya/dlya-rukovoditeley') },
    { url: absoluteUrl('/resheniya/dlya-inzhenerov') },
    { url: absoluteUrl('/resheniya/dlya-sluzhby-bezopasnosti') },
    { url: absoluteUrl('/resheniya/torgovye-centry') },
    { url: absoluteUrl('/resheniya/biznes-centry') },
    { url: absoluteUrl('/resheniya/skladskie-kompleksy') },
    { url: absoluteUrl('/resheniya/zastroyschiki') },

    // Обзорные страницы (TSX, не в меню, но полезны для индексации / AI)
    { url: absoluteUrl('/resheniya/sravnenie-podhodov') },
  ];

  // Контентные страницы из /content (MD)
  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...getAllContentMeta('resheniya').map((m) => ({
      url: absoluteUrl(`/resheniya/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : undefined,
    })),
    ...getAllContentMeta('vozmozhnosti').map((m) => ({
      url: absoluteUrl(`/vozmozhnosti/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : undefined,
    })),
    ...getAllContentMeta('oborudovanie').map((m) => ({
      url: absoluteUrl(`/oborudovanie/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : undefined,
    })),
    ...getAllContentMeta('keysy').map((m) => ({
      url: absoluteUrl(`/keysy/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : undefined,
    })),
    ...getAllContentMeta('stati').map((m) => ({
      url: absoluteUrl(`/stati/${m.slug}`),
      lastModified: m.lastModified ? new Date(m.lastModified) : undefined,
    })),
  ];

  // Убираем дубликаты на всякий случай
  const unique = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const item of [...staticRoutes, ...dynamicRoutes]) {
    unique.set(item.url, item);
  }
  return Array.from(unique.values());
}
