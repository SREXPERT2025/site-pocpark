import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/app/config/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/parkovka/embed',
          '/quiz',
          '/demo/arendar/',
          '/demo/gostevaya-zayavka',
          '/demo/vladelec-parkovki',
          '/demo/web-skidki',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
