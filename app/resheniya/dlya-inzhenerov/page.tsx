import type { Metadata } from 'next';

import Hero from './components/Hero';
import TechStack from './components/TechStack';
import Integration from './components/Integration';
import Reliability from './components/Reliability';
import Documentation from './components/Documentation';
import CallToAction from './components/CallToAction';

import AnswerFirst from '@/app/components/content/AnswerFirst';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ExtendedInfo from '@/app/components/content/ExtendedInfo';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import { getExtendedContentBySlug } from '@/lib/content-parser';

export const metadata: Metadata = {
  "title": "Автоматизация парковки для инженеров — схемы, API, надежность | РОСПАРК",
  "description": "Технические решения РОСПАРК для инженеров и интеграторов: контроллеры, RS-485, Ethernet, REST API, схемы подключения, документация и поддержка. Проектирование и ТЗ.",
  "keywords": [
    "автоматизация парковки",
    "интеграция парковки",
    "API парковки",
    "RS-485 парковка",
    "контроллер шлагбаума",
    "ANPR интеграция",
    "парковочная система",
    "РОСПАРК"
  ],
  "openGraph": {
    "title": "Автоматизация парковки для инженеров — РОСПАРК",
    "description": "Инженерный взгляд: схемы, интерфейсы, интеграции, отказоустойчивость, эксплуатация.",
    "type": "website"
  }
};

export default function EngineersPage() {
  const extended = getExtendedContentBySlug('resheniya', 'dlya-inzhenerov');
  const faq = extended?.faq ?? [];
  const answerFirst = extended?.answerFirst;

  const answerLead =
    answerFirst?.lead ??
    'РОСПАРК — инженерно-ориентированная система автоматизации парковки: понятные интерфейсы, документированные сценарии, предсказуемая эксплуатация и быстрые интеграции.';

  const answerBullets =
    answerFirst?.bullets?.length
      ? answerFirst.bullets
      : [
          'Получаете ТЗ, схемы, спецификации и чек-лист пусконаладки.',
          'Интеграции — по согласованной модели данных: события, статусы, справочники.',
          'Отказоустойчивость: продуманные режимы деградации и регламенты.',
          'Прозрачная эксплуатация: логи, события, диагностика, поддержка.',
        ];

  return (
    <main className="bg-white">
      <FaqJsonLd items={faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Для инженеров', url: '/resheniya/dlya-inzhenerov' },
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
        slug="dlya-inzhenerov"
        className="pb-8"
        summaryLabel="Расширенная информация: интерфейсы, интеграции, чек-лист внедрения, FAQ"
      />

      <TechStack />
      <Integration />
      <Reliability />
      <Documentation />
      <CallToAction />

    </main>
  );
}
