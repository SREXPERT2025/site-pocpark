import type { Metadata } from 'next';

import { canonicalUrl } from '@/app/config/site-url';
import './v4-2.css';

export const metadata: Metadata = {
  title: 'Решение для въезда и парковки',
  description:
    'Шлагбаумы, въезд по номеру, парковочные билеты, оплата и контроль. РОСПАРК подберёт решение под задачу вашего объекта.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: canonicalUrl('/v4-2'),
  },
  openGraph: {
    title: 'Решим вашу задачу с въездом и парковкой — РОСПАРК',
    description:
      'От простого шлагбаума до автоматического въезда, оплаты и контроля.',
    url: canonicalUrl('/v4-2'),
    type: 'website',
    images: [
      {
        url: '/images/landing/v4-1/hero-object.webp',
        width: 1800,
        height: 1200,
        alt: 'Автомобиль подъезжает к автоматизированному въезду',
      },
    ],
  },
};

export default function V42Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
