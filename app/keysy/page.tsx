import Hero from '@/app/components/ui/Hero';
import ProjectCard from '@/app/components/ui/ProjectCard';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import CaseStudyItemListJsonLd from '@/app/components/content/CaseStudyItemListJsonLd';
import ProjectsControls, {
  type ProjectsSortKey,
} from '@/app/components/projects/ProjectsControls';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { getAllContentMeta } from '@/lib/content-parser';

export const metadata = {
  title: 'Проекты',
  description:
    'Реализованные проекты РОСПАРК: задачи, сроки, метрики, результат.',
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
          description="Реализованные внедрения РОСПАРК: от задачи до измеримого результата."
          cta={{ label: 'Получить консультацию', href: '/quiz?source=consult' }}
        />
      </section>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <section className="w-full px-[20px] pt-10">

        <ProjectsControls
          formats={formats}
          selectedFormat={selectedFormat}
          selectedSort={selectedSort}
        />

        <div className="mt-16">

          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">
              Выполненные проекты
            </h2>

            <span className="text-sm text-gray-500">
              {sorted.length} проектов
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
                  format={(m as any).format}
                  tags={m.tags}
                />
              </div>
            ))}

          </div>

        </div>

        <div className="mt-24">
          <LeadFormSection
            sourceSection="projects"
            title="Хотите похожий результат?"
            description="Оставьте контакты — предложим решение под ваш объект."
            submitLabel="Получить консультацию"
          />
        </div>

      </section>

    </div>
  );
}
