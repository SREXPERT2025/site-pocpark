import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Hero from '@/app/components/ui/Hero';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import FaqBlock from '@/app/components/ui/FaqBlock';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import ArticleJsonLd from '@/app/components/content/ArticleJsonLd';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { canonicalUrl } from '@/app/config/site-url';
import { getAllContentMeta, getContentBySlug } from '@/lib/content-parser';

function formatArticleDate(value?: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

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
      images: article.coverImage ? [canonicalUrl(article.coverImage)] : undefined,
    },
  };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getContentBySlug('stati', params.slug);
  if (!article) notFound();
  const updatedAt = formatArticleDate(article.lastModified);

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

      {article.category || updatedAt ? (
        <div className="mx-auto mt-5 flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary">
          {article.category ? <span className="font-medium text-text-primary">{article.category}</span> : null}
          {updatedAt ? <time dateTime={article.lastModified}>Обновлено {updatedAt}</time> : null}
        </div>
      ) : null}

      {article.coverImage ? (
        <figure className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-md border border-border-primary bg-bg-secondary">
          <Image
            src={article.coverImage}
            alt={article.title}
            width={1600}
            height={900}
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="h-auto w-full object-cover"
            priority
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

      <div className="mx-auto mt-12 max-w-4xl">
        <article
          className="prose prose-slate max-w-none prose-headings:scroll-mt-28 prose-a:text-accent-primary"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        <FaqBlock title="Вопросы и ответы" items={article.faq ?? []} />

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
      </div>
    </div>
  );
}
