import type { Metadata } from 'next';

import Hero from './components/Hero';
import PainPoints from './components/PainPoints';
import Control from './components/Control';
import Solution from './components/Solution';
import Reliability from './components/Reliability';
import CallToAction from './components/CallToAction';

import AnswerFirst from '@/app/components/content/AnswerFirst';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ExtendedInfo from '@/app/components/content/ExtendedInfo';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import { getExtendedContentBySlug } from '@/lib/content-parser';

export const metadata: Metadata = {
  "title": "Автоматизация парковки для службы безопасности — контроль, события, доступы | РОСПАРК",
  "description": "РОСПАРК для службы безопасности: контроль въезда/выезда, фотофиксация, журнал событий, чёрные списки, гостевые сценарии, права доступа и работа в офлайн-режиме.",
  "keywords": [
    "служба безопасности парковка",
    "контроль въезда выезда",
    "журнал событий парковка",
    "черный список номеров",
    "контроль доступа парковка",
    "2FA идентификация парковка",
    "РОСПАРК"
  ],
  "openGraph": {
    "title": "Автоматизация парковки для службы безопасности — РОСПАРК",
    "description": "Контроль доступов, события, фотофиксация, антифрод и режимы отказоустойчивости.",
    "type": "website"
  }
};

export default function SecurityPage() {
  const extended = getExtendedContentBySlug('resheniya', 'dlya-sluzhby-bezopasnosti');
  const faq = extended?.faq ?? [];
  const answerFirst = extended?.answerFirst;

  const answerLead =
    answerFirst?.lead ??
    'РОСПАРК даёт службе безопасности управляемый контур доступа: контроль проезда, прозрачные исключения, журнал событий и антифрод-сценарии — без хаоса и «ручных обходов».';

  const answerBullets =
    answerFirst?.bullets?.length
      ? answerFirst.bullets
      : [
          'Контроль доступов: роли, политики, регламент исключений и подтверждений.',
          'Аудит и расследования: события, попытки проезда, ручные вмешательства.',
          'Антифрод: стоп-листы, правила реагирования, контроль «льгот».',
          'Отказоустойчивость: офлайн-режимы и безопасные сценарии при сбоях сети.',
        ];

  return (
    <main className="bg-white">
      <FaqJsonLd items={faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Для службы безопасности', url: '/resheniya/dlya-sluzhby-bezopasnosti' },
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
        slug="dlya-sluzhby-bezopasnosti"
        className="pb-8"
        summaryLabel="Расширенная информация: политики доступа, аудит, антифрод, офлайн-режимы, FAQ"
      />

      <PainPoints />
      <Control />
      <Solution />
      <Reliability />
      <CallToAction />

    </main>
  );
}
