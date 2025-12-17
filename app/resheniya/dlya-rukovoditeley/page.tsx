import type { Metadata } from 'next';

/* ====== COMPONENTS ====== */
import Hero from './components/Hero';
import PainPoints from './components/PainPoints';
import Solution from './components/Solution';
import Metrics from './components/Metrics';
import ObjectTypes from './components/ObjectTypes';
import CallToAction from './components/CallToAction';

/* ====== SEO ====== */
export const metadata: Metadata = {
  title:
    'Автоматизация парковки для руководителей — рост NOI и контроль доходов | РОСПАРК',
  description:
    'Решения РОСПАРК для директоров и управляющих: прозрачная выручка, контроль парковки, рост NOI на 15–30%, автоматизация без персонала. Аудит и расчет за 1 день.',
  keywords: [
    'автоматизация парковки',
    'парковка для торгового центра',
    'управление парковкой',
    'рост NOI',
    'доход с парковки',
    'парковочная система',
    'автоматическая парковка',
    'РОСПАРК',
  ],
  openGraph: {
    title:
      'Автоматизация парковки для руководителей — РОСПАРК',
    description:
      'Как превратить парковку в управляемый актив: контроль выручки, автоматизация, рост дохода.',
    type: 'website',
  },
};

/* ====== PAGE ====== */
export default function Page() {
  return (
    <main className="bg-white">

      {/* HERO / ВХОД */}
      <Hero />

      {/* БОЛИ */}
      <PainPoints />

      {/* РЕШЕНИЕ */}
      <Solution />

      {/* ЦИФРЫ И ЭФФЕКТ */}
      <Metrics />

      {/* ТИПЫ ОБЪЕКТОВ / ПЕРЕЛИНКОВКА */}
      <ObjectTypes />

      {/* CTA / ЛИДОГЕНЕРАЦИЯ */}
      <CallToAction />

    </main>
  );
}
