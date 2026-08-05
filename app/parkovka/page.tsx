import type { Metadata } from 'next';

import ServiceJsonLd from '@/app/components/content/ServiceJsonLd';
import { canonicalUrl } from '@/app/config/site-url';
import {
  landingIndexable,
  landingRuntimeMode,
} from '@/app/lib/landing-runtime';
import ParkovkaExperience from './ParkovkaExperience';

export function generateMetadata(): Metadata {
  const index = landingIndexable();
  return {
    title: 'Организовать парковку — решение под вашу задачу',
    description:
      'РОСПАРК подбирает решения для въезда и парковки: шлагбаумы, распознавание номеров, билеты, карты, оплата и контроль.',
    robots: {
      index,
      follow: landingRuntimeMode() === 'production',
    },
    alternates: {
      canonical: canonicalUrl('/parkovka'),
    },
  };
}

export default function ParkovkaPage() {
  const runtimeMode = landingRuntimeMode();
  return (
    <>
      <ServiceJsonLd
        name="Организация въезда и парковки под задачу объекта"
        description="Подбор решения РОСПАРК для въезда и парковки: шлагбаумы, распознавание номеров, билеты, карты, оплата и контроль."
        serviceType="Автоматизация парковки"
        url="/parkovka"
      />
      <main id="main-content" className="parkovka-shell">
        {runtimeMode === 'preview' ? (
          <aside className="parkovka-preview-status">
            Тестовый предпросмотр: форма лендинга не отправляет и не сохраняет
            данные.
          </aside>
        ) : null}
        <ParkovkaExperience runtimeMode={runtimeMode} />
      </main>
    </>
  );
}
