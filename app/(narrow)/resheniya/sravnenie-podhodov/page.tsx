import type { Metadata } from 'next';

import Hero from './components/Hero';
import ComparisonTable from './components/ComparisonTable';
import ApproachCards from './components/ApproachCards';
import TcoSection from './components/TcoSection';
import CallToAction from './components/CallToAction';

export const metadata: Metadata = {
  title: 'Сравнение подходов к автоматизации парковки — аренда, “коробка”, под ключ | РОСПАРК',
  description:
    'Сравниваем 3 подхода к автоматизации парковки: аренда (ревшэр), коробочное решение + монтаж, система под ключ от производителя (РОСПАРК). Когда что выгоднее и почему важно считать стоимость владения.',
  alternates: {
    canonical: '/resheniya/sravnenie-podhodov',
  },
  openGraph: {
    title: 'Сравнение подходов к автоматизации парковки | РОСПАРК',
    description:
      '3 подхода: аренда, коробка+монтаж, под ключ. Выбор под ваш объект и финансовую модель.',
    url: '/resheniya/sravnenie-podhodov',
    type: 'article',
  },
};

export default function ComparisonApproachesPage() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />
      <ComparisonTable />
      <ApproachCards />
      <TcoSection />
      <CallToAction />
    </main>
  );
}
