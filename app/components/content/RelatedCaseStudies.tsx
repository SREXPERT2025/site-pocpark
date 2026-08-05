import Link from 'next/link';

import CaseStudyItemListJsonLd from '@/app/components/content/CaseStudyItemListJsonLd';
import ProjectCard from '@/app/components/ui/ProjectCard';

export type RelatedCaseStudy = {
  title: string;
  description: string;
  href: `/keysy/${string}`;
  coverImage: string;
  category: string;
};

export default function RelatedCaseStudies({
  title = 'Выполненные объекты с похожими задачами',
  description,
  items,
}: {
  title?: string;
  description: string;
  items: RelatedCaseStudy[];
}) {
  if (!items.length) return null;

  const gridClassName =
    items.length > 2
      ? 'lg:grid-cols-3'
      : items.length === 2
        ? 'md:grid-cols-2'
        : 'max-w-xl';

  return (
    <section className="border-y border-slate-200 bg-slate-50 py-12">
      <CaseStudyItemListJsonLd
        name={title}
        description={description}
        items={items.map((item) => ({
          name: item.title,
          description: item.description,
          url: item.href,
          image: item.coverImage,
        }))}
      />

      <div className="container mx-auto max-w-6xl min-w-0 px-4">
        <div className="max-w-3xl">
          <h2 className="break-words text-2xl font-bold text-slate-900 md:text-3xl">
            {title}
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700">{description}</p>
        </div>

        <div className={`mt-7 grid gap-5 ${gridClassName}`}>
          {items.map((item) => (
            <ProjectCard
              key={item.href}
              title={item.title}
              description={item.description}
              href={item.href}
              coverImage={item.coverImage}
              category={item.category}
            />
          ))}
        </div>

        <Link
          href="/keysy"
          className="mt-7 inline-flex font-semibold text-blue-700 hover:underline"
        >
          Смотреть все выполненные объекты →
        </Link>
      </div>
    </section>
  );
}
