import LinkGrid from '@/app/components/ui/LinkGrid';
import Hero from '@/app/components/ui/Hero';
import { getAllContentMeta } from '@/lib/content-parser';

export const metadata = {
  title: 'Решения',
  description: 'Решения РОСПАРК для бизнеса: контроль доступа, оплата, аналитика.',
};

export default function ResheniyaIndex() {
  const items = getAllContentMeta('resheniya');

  return (
    <div>
      <Hero
        title="Решения РОСПАРК для бизнеса"
        description="Подбор архитектуры, интеграции и сценариев: от парковки у офиса до крупных ТЦ."
        cta={{ label: 'Получить КП', href: '/quiz' }}
      />
      <LinkGrid
        title="Все решения"
        items={items.map((m) => ({
          title: m.title,
          description: m.description,
          href: `/resheniya/${m.slug}`,
        }))}
      />
    </div>
  );
}
