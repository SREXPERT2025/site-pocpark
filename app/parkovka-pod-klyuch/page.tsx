import type { Metadata } from 'next';

import { canonicalUrl } from '@/app/config/site-url';
import {
  landingIndexable,
  landingRuntimeMode,
} from '@/app/lib/landing-runtime';
import PuzzlePage from '@/app/puzzle2/page';

export function generateMetadata(): Metadata {
  const index = landingIndexable();
  return {
    title: 'Парковка под ключ: оборудование, ПО и запуск',
    description:
      'РОСПАРК подберёт парковочную систему под ваш объект: въезд, выезд, оплату, оборудование, программное обеспечение, монтаж и поддержку.',
    robots: {
      index,
      follow: landingRuntimeMode() === 'production',
    },
    alternates: {
      canonical: canonicalUrl('/parkovka-pod-klyuch'),
    },
    openGraph: {
      title: 'Парковка под ключ — РОСПАРК',
      description:
        'Начните с задачи объекта. РОСПАРК подберёт оборудование, программное обеспечение и сценарий работы парковки.',
      url: canonicalUrl('/parkovka-pod-klyuch'),
      type: 'website',
      images: [
        {
          url: '/images/landing/puzzle/puzzle-hero.webp',
          width: 2048,
          height: 1152,
          alt: 'Оборудование РОСПАРК как части единой парковочной системы',
        },
      ],
    },
  };
}

export default PuzzlePage;
