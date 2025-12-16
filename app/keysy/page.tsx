import LinkGrid from '@/app/components/ui/LinkGrid';
import Hero from '@/app/components/ui/Hero';
import { getAllContentMeta } from '@/lib/content-parser';

export const metadata = {
  title: 'Кейсы',
  description: 'Примеры внедрений РОСПАРК: сроки, метрики, результат.',
};

export default function KeysyIndex() {
  const items = getAllContentMeta('keysy');

  return (
    <div>
      <Hero
        title="Кейсы внедрения"
        description="Реальные проекты: задачи, решение, сроки и эффект для бизнеса."
        cta={{ label: 'Получить КП', href: '/quiz' }}
      />
      <LinkGrid
        title="Все кейсы"
        items={items.map((m) => ({
          title: m.title,
          description: m.description,
          href: `/keysy/${m.slug}`,
        }))}
      />
    </div>
  );
}
