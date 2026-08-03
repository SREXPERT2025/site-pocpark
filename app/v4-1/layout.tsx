import type { Metadata } from 'next';

import { canonicalUrl } from '@/app/config/site-url';
import './v4-1.css';

export const metadata: Metadata = {
  title: 'Автоматизированная парковка для вашего объекта',
  description:
    'Удобный въезд, оплата и контроль в одной системе. РОСПАРК подберёт решение для ЖК, бизнес-центра, торгового объекта или предприятия.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: canonicalUrl('/v4-1'),
  },
  openGraph: {
    title: 'Автоматизированная парковка для вашего объекта — РОСПАРК',
    description:
      'От простого шлагбаума до автоматического въезда, оплаты и контроля.',
    url: canonicalUrl('/v4-1'),
    type: 'website',
    images: [
      {
        url: '/images/landing/v4-1/hero-object.webp',
        width: 1800,
        height: 1200,
        alt: 'Автомобиль подъезжает к автоматизированному въезду бизнес-центра',
      },
    ],
  },
};

export default function V41Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
