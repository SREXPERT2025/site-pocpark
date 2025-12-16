import Link from 'next/link';
import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import { getAllContentMeta } from '@/lib/content-parser';

export const metadata: Metadata = {
  title: 'Возможности РОСПАРК',
  description: 'Ключевые возможности программной платформы РОСПАРК: тарификация, интеграции, распознавание номеров, абонементы, онлайн-оплата.',
};

export default function VozmozhnostiIndexPage() {
  const items = getAllContentMeta('vozmozhnosti');

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Возможности' }]} />
      <Hero
        title="Возможности РОСПАРК"
        description="Ключевые модули и сценарии, которые превращают парковку в управляемый и прибыльный сервис."
        cta={{ label: 'Получить КП', href: '/quiz' }}
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {items.map((m) => (
          <Link
            key={m.slug}
            href={`/vozmozhnosti/${m.slug}`}
            className="rounded-2xl border p-6 transition hover:bg-slate-50"
          >
            <div className="text-lg font-semibold">{m.title}</div>
            <div className="mt-2 text-sm text-slate-600">{m.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
