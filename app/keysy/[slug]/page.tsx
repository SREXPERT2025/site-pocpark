import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import MetricsBlock from '@/app/components/ui/MetricsBlock';
import FaqBlock from '@/app/components/ui/FaqBlock';
import ProjectCard from '@/app/components/ui/ProjectCard';
import AnswerFirst from '@/app/components/content/AnswerFirst';
import ExtendedInfo from '@/app/components/content/ExtendedInfo';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { getAllContentMeta, getContentBySlug } from '@/lib/content-parser';

export function generateStaticParams() {
  return getAllContentMeta('keysy').map((m) => ({ slug: m.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const data = getContentBySlug('keysy', params.slug);
  if (!data) return { title: 'Проект не найден' };

  return {
    title: `${data.title} — Проекты РОСПАРК`,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      images: data.coverImage ? [data.coverImage] : undefined,
    },
  };
}

function scoreSimilar(baseTags: string[], itemTags: string[], sameCategory: boolean) {
  const base = new Set((baseTags ?? []).map((t) => t.toLowerCase()));
  let score = sameCategory ? 3 : 0;
  (itemTags ?? []).forEach((t) => {
    if (base.has(String(t).toLowerCase())) score += 2;
  });
  return score;
}

export default function KeysyPage({ params }: { params: { slug: string } }) {
  const data = getContentBySlug('keysy', params.slug);
  if (!data) return notFound();

  const all = getAllContentMeta('keysy');

  const related = all
    .filter((m) => m.slug !== params.slug)
    .map((m) => {
      const score = scoreSimilar(
        data.tags ?? [],
        m.tags ?? [],
        Boolean(data.category && m.category && data.category === m.category)
      );
      const d = m.lastModified ? Date.parse(m.lastModified) : 0;
      return { m, score, d };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => (b.score - a.score) || (b.d - a.d))
    .slice(0, 3)
    .map((x) => x.m);

  const faq = data.faq ?? [];
  const metrics = data.metrics ?? [];

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Проекты', url: '/keysy' },
          { name: data.title, url: `/keysy/${data.slug}` },
        ]}
      />
      {faq.length > 0 && <FaqJsonLd items={faq} />}

      <Hero
        title={data.title}
        description={data.description}
        cta={{ label: 'Получить консультацию', href: '/contacts' }}
      />

      <div className="container">
        {data.coverImage && (
          <div className="mt-10 overflow-hidden rounded-2xl bg-slate-100">
            <img
              src={data.coverImage}
              alt={data.title}
              className="h-full w-full object-cover object-center"
            />
          </div>
        )}

        {data.answerFirst?.lead && (
          <AnswerFirst
            title="Главное за 30 секунд"
            lead={data.answerFirst.lead}
            bullets={data.answerFirst.bullets ?? []}
          />
        )}

        {metrics.length > 0 && (
          <section className="mt-section">
            <MetricsBlock items={metrics} />
          </section>
        )}

        {(data.videoUrl && String(data.videoUrl).trim()) && (
          <section className="mt-section">
            <h2 className="text-xl font-semibold text-text-primary">Видеообзор</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-black">
              <div className="relative aspect-video w-full">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={data.videoUrl}
                  title="Видеообзор проекта"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        )}

        <section className="mt-section">
          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
          </div>
        </section>

        <ExtendedInfo section="keysy" slug={data.slug} />

        <FaqBlock title="Вопросы и ответы" items={faq} />

        {related.length > 0 && (
          <section className="mt-section">
            <h2 className="text-xl font-semibold text-text-primary">Похожие проекты</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((m) => (
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
        )}

        <LeadFormSection
          className="mt-section"
          sourceSection="project"
          title="Обсудить похожий проект"
          description="Оставьте контакты — уточним параметры объекта и предложим план внедрения РОСПАРК."
          submitLabel="Получить консультацию"
        />
      </div>
    </div>
  );
}
