import type { MetadataRoute } from 'next';
import { getAllContentMeta } from '@/lib/content-parser';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rospark.rf';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now },
    { url: `${SITE_URL}/resheniya`, lastModified: now },
    { url: `${SITE_URL}/oborudovanie`, lastModified: now },
    { url: `${SITE_URL}/keysy`, lastModified: now },
    { url: `${SITE_URL}/quiz`, lastModified: now },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...getAllContentMeta('resheniya').map((m) => ({
      url: `${SITE_URL}/resheniya/${m.slug}`,
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

  return [...staticRoutes, ...dynamicRoutes];
}
