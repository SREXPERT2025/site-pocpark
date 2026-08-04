import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import ProjectCard from '@/app/components/ui/ProjectCard';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ArticleItemListJsonLd from '@/app/components/content/ArticleItemListJsonLd';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { canonicalUrl } from '@/app/config/site-url';
import { getAllContentMeta } from '@/lib/content-parser';
import LandingEntryBanner from '@/app/components/landing/LandingEntryBanner';

export const metadata: Metadata = {
  title: 'Статьи об автоматизации парковок',
  description:
    'Практические материалы РОСПАРК о выборе парковочной системы, распознавании номеров, гостевом доступе, оплате и эксплуатации.',
  alternates: {
    canonical: canonicalUrl('/stati'),
  },
  openGraph: {
    title: 'Статьи об автоматизации парковок',
    description:
      'Практические материалы РОСПАРК для руководителей, инженеров и служб безопасности.',
    url: canonicalUrl('/stati'),
    type: 'website',
  },
};

export default function ArticlesPage() {
  const articles = getAllContentMeta('stati').sort((a, b) => {
    const da = a.lastModified ? Date.parse(a.lastModified) : 0;
    const db = b.lastModified ? Date.parse(b.lastModified) : 0;
    return db - da;
  });

  return (
    <div className="w-full">
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Статьи', url: '/stati' },
        ]}
      />

      <ArticleItemListJsonLd
        name="Статьи РОСПАРК"
        items={articles.map((article) => ({
          title: article.title,
          description: article.description,
          url: `/stati/${article.slug}`,
          image: article.coverImage,
          dateModified: article.lastModified,
        }))}
      />

      <section className="w-full px-[20px] pt-6">
        <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Статьи' }]} />

        <Hero
          title="Статьи"
          description="Практические материалы об автоматизации парковок: выбор системы, доступ по номеру, гостевые сценарии, оплата и эксплуатация."
          cta={{ label: 'Обсудить задачу', href: '/quiz?source=articles' }}
        />
      </section>

      <section className="w-full px-[20px] pt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-text-primary">Материалы для проектирования и выбора системы</h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-text-secondary">
              Пишем о вопросах, которые возникают до внедрения: состав решения, сценарии доступа, роль охраны,
              требования к оборудованию и подготовка объекта.
            </p>
          </div>

          <span className="hidden text-sm text-text-secondary md:block">
            {articles.length} материалов
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-[15px] md:grid-cols-2">
          {articles.map((article) => (
            <ProjectCard
              key={article.slug}
              title={article.title}
              description={article.description}
              href={`/stati/${article.slug}`}
              coverImage={article.coverImage}
              category={article.category}
              tags={article.tags}
              imageSizes="(min-width: 768px) 50vw, 100vw"
            />
          ))}
        </div>

        <LandingEntryBanner
          sourceSection="articles_hub"
          target="parkovka"
          title="Хотите перейти от информации к решению?"
          description="Выберите, что сейчас не устраивает на парковке, и посмотрите возможный путь без технического задания и сложных терминов."
        />

        <div className="mt-20">
          <LeadFormSection
            sourceSection="articles"
            title="Нужна парковочная система под ваш объект?"
            description="Опишите объект и задачу, а мы подскажем, какие сценарии доступа, оплаты и контроля стоит заложить в проект."
            submitLabel="Получить консультацию"
            minimalFields
          />
        </div>
      </section>
    </div>
  );
}
