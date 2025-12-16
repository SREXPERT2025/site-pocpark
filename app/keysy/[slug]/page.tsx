import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import MetricsBlock from '@/app/components/ui/MetricsBlock';
// Добавляем импорт ContentDoc, чтобы объединить типы
import { getAllContentMeta, getContentBySlug, type ContentDoc, type CaseFrontmatter } from '@/lib/content-parser';

// Объединяем стандартный контент и специфику кейсов
type CaseDoc = ContentDoc & CaseFrontmatter;

export function generateStaticParams() {
  return getAllContentMeta('keysy').map((m) => ({ slug: m.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const data = getContentBySlug<CaseDoc>('keysy', params.slug);
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
  };
}

export default function CasePage({ params }: { params: { slug: string } }) {
  const data = getContentBySlug<CaseDoc>('keysy', params.slug);
  if (!data) notFound();

  // ✅ ИСПРАВЛЕНО: было data.projectMetrics, стало data.metrics (как в файле типов)
  const metrics = data.metrics ?? [];

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 pt-12">
        <Breadcrumbs
          items={[
            { label: 'Главная', href: '/' },
            { label: 'Кейсы', href: '/keysy' },
            { label: data.title, href: `/keysy/${data.slug}` },
          ]}
        />
      </div>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-6">
          {data.title}
        </h1>

        {/* Если есть обложка - показываем */}
        {data.coverImage && (
           <div className="mb-10 overflow-hidden rounded-xl bg-slate-100">
             <img 
               src={data.coverImage} 
               alt={data.title} 
               className="h-full w-full object-cover object-center"
             />
           </div>
        )}

        {/* Блок метрик */}
        {metrics.length > 0 && (
          <div className="mb-12">
            <MetricsBlock items={metrics} />
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-1">
          <div className="prose prose-lg prose-blue max-w-none">
            <div dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
          </div>
        </div>
      </main>
    </div>
  );
}
