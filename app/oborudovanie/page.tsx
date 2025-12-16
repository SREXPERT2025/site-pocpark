import LinkGrid from '@/app/components/ui/LinkGrid';
import Hero from '@/app/components/ui/Hero';
import { getAllContentMeta } from '@/lib/content-parser';

export const metadata = {
  title: 'Оборудование',
  description: 'Оборудование РОСПАРК: стойки, шлагбаумы, терминалы, датчики.',
};

export default function OborudovanieIndex() {
  const items = getAllContentMeta('oborudovanie');

  return (
    <div>
      <Hero
        title="Оборудование"
        description="Промышленное исполнение, сервисопригодность, поддержка и интеграции."
        cta={{ label: 'Получить КП', href: '/quiz' }}
      />
      <LinkGrid
        title="Каталог"
        items={items.map((m) => ({
          title: m.title,
          description: m.description,
          href: `/oborudovanie/${m.slug}`,
        }))}
      />
    </div>
  );
}
