import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import ArticleJsonLd from '@/app/components/content/ArticleJsonLd';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { canonicalUrl } from '@/app/config/site-url';
import { getAllContentMeta, getContentBySlug } from '@/lib/content-parser';

export function generateStaticParams() {
  return getAllContentMeta('stati').map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getContentBySlug('stati', params.slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: canonicalUrl(`/stati/${params.slug}`),
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: canonicalUrl(`/stati/${params.slug}`),
      type: 'article',
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getContentBySlug('stati', params.slug);
  if (!article) notFound();

  return (
    <div className="w-full px-[20px] pt-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Статьи', url: '/stati' },
          { name: article.title, url: `/stati/${article.slug}` },
        ]}
      />

      <ArticleJsonLd
        title={article.title}
        description={article.description}
        url={`/stati/${article.slug}`}
        dateModified={article.lastModified}
        image={article.coverImage}
      />

      {article.faq?.length ? <FaqJsonLd items={article.faq} /> : null}

      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Статьи', href: '/stati' },
          { label: article.title },
        ]}
      />

      <Hero
        title={article.title}
        description={article.description}
        cta={{ label: 'Обсудить проект', href: `/quiz?source=article-${article.slug}` }}
      />

      {article.coverImage ? (
        <figure className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-md border border-border-primary bg-bg-secondary">
          <img
            src={article.coverImage}
            alt={article.title}
            className="h-auto w-full object-cover"
            loading="eager"
          />
        </figure>
      ) : null}

      {article.answerFirst ? (
        <section className="mx-auto mt-10 max-w-4xl rounded-md border border-border-primary bg-bg-secondary p-6">
          <p className="text-base leading-relaxed text-text-primary">{article.answerFirst.lead}</p>
          {article.answerFirst.bullets.length ? (
            <ul className="mt-5 grid gap-3 text-sm text-text-secondary md:grid-cols-2">
              {article.answerFirst.bullets.map((item) => (
                <li key={item} className="rounded-md bg-bg-primary p-4">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <main className="mx-auto mt-12 max-w-4xl">
        <article
          className="prose prose-slate max-w-none prose-headings:scroll-mt-28 prose-a:text-accent-primary"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        <div className="mt-16 border-t border-border-primary pt-12">
          <LeadFormSection
            sourceSection="article"
            sourcePage={`/stati/${article.slug}`}
            title="Хотите применить это на своем объекте?"
            description="Опишите тип объекта и текущую задачу. Подскажем, какие сценарии доступа и состав системы стоит рассмотреть."
            submitLabel="Получить консультацию"
            minimalFields
            compact
          />
        </div>
      </main>
    </div>
  );
}
