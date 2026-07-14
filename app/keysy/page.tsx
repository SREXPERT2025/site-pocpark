import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import ProjectCard from '@/app/components/ui/ProjectCard';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import CaseStudyItemListJsonLd from '@/app/components/content/CaseStudyItemListJsonLd';
import ProjectsControls, {
  type ProjectsSortKey,
} from '@/app/components/projects/ProjectsControls';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { canonicalUrl } from '@/app/config/site-url';
import { getAllContentMeta } from '@/lib/content-parser';

export const metadata: Metadata = {
  title: 'Проекты',
  description:
    'Реализованные проекты РОСПАРК: задачи, сроки, метрики, результат.',
  alternates: {
    canonical: canonicalUrl('/keysy'),
  },
  openGraph: {
    title: 'Проекты',
    description: 'Реализованные проекты РОСПАРК: задачи, сроки, метрики, результат.',
    url: canonicalUrl('/keysy'),
    type: 'website',
  },
};

type SearchParams = {
  category?: string;
  sort?: ProjectsSortKey;
};

function projectsCountLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} проектов`;
  }
  if (lastDigit === 1) return `${count} проект`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} проекта`;
  return `${count} проектов`;
}

export default function KeysyIndex({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const all = getAllContentMeta('keysy');

  const categories = Array.from(
    new Set(all.map((m) => m.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'ru')) as string[];

  const selectedCategory = searchParams?.category;
  const selectedSort = (searchParams?.sort ?? 'title_asc') as ProjectsSortKey;

  const filtered = all.filter((m) => {
    if (!selectedCategory) return true;
    return m.category === selectedCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    const direction = selectedSort === 'title_desc' ? -1 : 1;
    return direction * a.title.localeCompare(b.title, 'ru');
  });

  const listItems = sorted.map((m) => ({
    name: m.title,
    description: m.description,
    url: `/keysy/${m.slug}`,
    image: m.coverImage,
    dateModified: m.lastModified,
  }));

  return (
    <div className="w-full">

      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Проекты', url: '/keysy' },
        ]}
      />

      <CaseStudyItemListJsonLd
        name="Проекты РОСПАРК"
        description="Реализованные проекты: задачи, решение, сроки, метрики и результат."
        items={listItems}
      />

      {/* HERO */}
      <section className="w-full px-[20px] pt-6">
        <Hero
          title="Проекты"
          description="Реализованные объекты и примеры внедрения парковочных систем РОСПАРК."
          cta={{ label: 'Получить консультацию', href: '/quiz?source=consult' }}
        />
      </section>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <section className="w-full px-[20px] pt-10">

        <ProjectsControls
          categories={categories}
          selectedCategory={selectedCategory}
          selectedSort={selectedSort}
        />

        <div className="mt-16">

          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">
              Реализованные объекты РОСПАРК
            </h2>

            <span className="text-sm text-gray-500">
              {projectsCountLabel(sorted.length)}
            </span>
          </div>

          {/* СЕТКА 2 В РЯД, GAP 15 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[15px]">

            {sorted.map((m) => (
              <div
                key={m.slug}
                className="transition-all duration-300 hover:-translate-y-1"
              >
                <ProjectCard
                  title={m.title}
                  description={m.description}
                  href={`/keysy/${m.slug}`}
                  coverImage={m.coverImage}
                  category={m.category}
                  tags={m.tags}
                  imageSizes="(min-width: 768px) 50vw, 100vw"
                />
              </div>
            ))}

          </div>

        </div>

        <div className="mt-24">
          <LeadFormSection
            sourceSection="projects"
            title="Нужно решение для вашего объекта?"
            description="Оставьте контакты — обсудим задачу, состав системы и предварительный план внедрения."
            submitLabel="Получить консультацию"
          />
        </div>

      </section>

    </div>
  );
}
