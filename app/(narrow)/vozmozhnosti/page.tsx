import type { Metadata } from 'next';
import FeaturesShowcase from '@/app/components/FeaturesShowcase';
import { canonicalUrl } from '@/app/config/site-url';

export const metadata: Metadata = {
  title: 'Возможности парковочной системы РОСПАРК',
  description:
    'Возможности РОСПАРК для автоматизации парковки: сценарии клиентов, оплата, распознавание номеров и управление доступом.',
  alternates: {
    canonical: canonicalUrl('/vozmozhnosti'),
  },
};

export default function Page(){return <FeaturesShowcase/>;}
