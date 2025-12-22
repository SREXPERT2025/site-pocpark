import Hero from '@/app/components/ui/Hero';
import ProjectCard from '@/app/components/ui/ProjectCard';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import CaseStudyItemListJsonLd from '@/app/components/content/CaseStudyItemListJsonLd';
import ProjectsControls, { type ProjectsSortKey } from '@/app/components/projects/ProjectsControls';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { getAllContentMeta } from '@/lib/content-parser';

export const metadata = {
  title: 'Проекты',
  description: 'Реализованные проекты РОСПАРК: задачи, сроки, метрики, результат.',
};

type SearchParams = {
  format?: string;
  sort?: ProjectsSortKey;
};

export default function KeysyIndex({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const all = getAllContentMeta('keysy');

  const formats = Array.from(
    new Set(all.map((m) => (m as any).format).filter(Boolean))
  ) as string[];

  const selectedFormat = searchParams?.format;
  const selectedSort = (searchParams?.sort ?? 'newest') as ProjectsSortKey;

  const filtered = all.filter((m) => {
    if (!selectedFormat) return true;
    return (m as any).format === selectedFormat;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (selectedSort === 'title_asc') {
      return a.title.localeCompare(b.title, 'ru');
    }
    // newest (по lastModified)
    const da = a.lastModified ? Date.parse(a.lastModified) : 0;
    const db = b.lastModified ? Date.parse(b.lastModified) : 0;
    return db - da;
  });

  const listItems = sorted.map((m) => ({
    name: m.title,
    description: m.description,
    url: `/keysy/${m.slug}`,
    image: m.coverImage,
    dateModified: m.lastModified,
  }));

  return (
    <div>
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

      <Hero
        title="Проекты"
        description="Реализованные внедрения РОСПАРК: от задачи до измеримого результата."
        cta={{ label: 'Получить консультацию', href: '/contacts' }}
      />

      <div className="container">
        <ProjectsControls
          formats={formats}
          selectedFormat={selectedFormat}
          selectedSort={selectedSort}
        />

        <section className="mt-section">
          <h2 className="text-xl font-semibold text-text-primary">
            Все проекты ({sorted.length})
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((m) => (
              <ProjectCard
                key={m.slug}
                title={m.title}
                description={m.description}
                href={`/keysy/${m.slug}`}
                coverImage={m.coverImage}
                format={(m as any).format}
                tags={m.tags}
              />
            ))}
          </div>
        </section>

        <LeadFormSection
          className="mt-section"
          sourceSection="projects"
          title="Хотите похожий результат?"
          description="Оставьте контакты — предложим решение, оборудование и план внедрения под ваш объект."
          submitLabel="Получить консультацию"
        />
      </div>
    </div>
  );
}
