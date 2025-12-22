import type { Metadata } from 'next';

import Hero from './components/Hero';
import PainPoints from './components/PainPoints';
import Solution from './components/Solution';
import Metrics from './components/Metrics';
import ObjectTypes from './components/ObjectTypes';
import CallToAction from './components/CallToAction';

import AnswerFirst from '@/app/components/content/AnswerFirst';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ExtendedInfo from '@/app/components/content/ExtendedInfo';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import { getExtendedContentBySlug } from '@/lib/content-parser';

export const metadata: Metadata = {
  "title": "Автоматизация парковки для руководителей — рост NOI и контроль доходов | РОСПАРК",
  "description": "Решения РОСПАРК для директоров и управляющих: прозрачная выручка, контроль парковки, рост NOI на 15–30%, автоматизация без персонала. Аудит и расчет за 1 день.",
  "keywords": [
    "автоматизация парковки",
    "парковка для торгового центра",
    "управление парковкой",
    "рост NOI",
    "доход с парковки",
    "парковочная система",
    "автоматическая парковка",
    "РОСПАРК"
  ],
  "openGraph": {
    "title": "Автоматизация парковки для руководителей — РОСПАРК",
    "description": "Как превратить парковку в управляемый актив: контроль выручки, автоматизация, рост дохода.",
    "type": "website"
  }
};

export default function RukovoditeliPage() {
  const extended = getExtendedContentBySlug('resheniya', 'dlya-rukovoditeley');
  const faq = extended?.faq ?? [];
  const answerFirst = extended?.answerFirst;

  const answerLead =
    answerFirst?.lead ??
    'РОСПАРК помогает руководителю превратить парковку в управляемый актив: контроль выручки, понятные правила для всех типов клиентов и прозрачные KPI.';

  const answerBullets =
    answerFirst?.bullets?.length
      ? answerFirst.bullets
      : [
          'Видите деньги и потери: отчёты, события, ручные вмешательства, инциденты.',
          'Снижаете операционные затраты: автоматизация въезда/выезда и оплаты.',
          'Управляете сервисом: очереди, скорость проезда, удобство для гостей.',
          'Готовите обоснование: аудит и расчёт проекта за 1 рабочий день.',
        ];

  return (
    <main className="bg-white">
      <FaqJsonLd items={faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Для руководителей', url: '/resheniya/dlya-rukovoditeley' },
        ]}
      />
      <Hero />

      <AnswerFirst
        className="py-10"
        lead={answerLead}
        bullets={answerBullets}
      />

      <ExtendedInfo
        section="resheniya"
        slug="dlya-rukovoditeley"
        className="pb-8"
        summaryLabel="Расширенная информация: KPI, окупаемость, риски, FAQ"
      />

      <PainPoints />
      <Solution />
      <Metrics />
      <ObjectTypes />
      <CallToAction />

    </main>
  );
}
