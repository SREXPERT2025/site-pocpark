import type { Metadata } from 'next';

import { canonicalUrl } from '@/app/config/site-url';
import './test2.css';

export const metadata: Metadata = {
  title: 'Решение для парковки под вашу задачу',
  description:
    'Шлагбаумы, распознавание номеров, парковочные билеты, оплата и контроль въезда. Расскажите о задаче — РОСПАРК предложит подходящие варианты.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: canonicalUrl('/test2'),
  },
  openGraph: {
    title: 'Решим вашу задачу с парковкой — РОСПАРК',
    description:
      'От простого шлагбаума до автоматического въезда и оплаты. Подберём понятное решение под ваш объект.',
    url: canonicalUrl('/test2'),
    type: 'website',
    images: [
      {
        url: '/images/landing/test2/hero-arrival.webp',
        width: 1800,
        height: 1012,
        alt: 'Автомобиль подъезжает к автоматизированному въезду на парковку',
      },
    ],
  },
};

export default function Test2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
