import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getContentBySlug, getAllContentMeta } from '@/lib/content-parser'; // Предполагаем, что парсер здесь
import { canonicalUrl } from '@/app/config/site-url';

// UI Компоненты
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import Hero from '@/app/components/ui/Hero'; // Путь может отличаться
import CtaBlock from '@/app/components/ui/CtaBlock'; // Путь может отличаться

// Генерируем все страницы этого раздела статически при сборке
export function generateStaticParams() {
  return getAllContentMeta('resheniya').map((meta) => ({ slug: meta.slug }));
}

// Генерируем метаданные страницы
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = getContentBySlug('resheniya', params.slug);
  if (!data) return { title: 'Страница не найдена' };
  
  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: canonicalUrl(`/resheniya/${params.slug}`),
    },
  };
}

// Рендер страницы
export default function ResheniePage({ params }: { params: { slug: string } }) {
  const data = getContentBySlug('resheniya', params.slug);

  if (!data) {
    notFound();
  }

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Решения', url: '/resheniya' },
          { name: data.title, url: `/resheniya/${params.slug}` },
        ]}
      />

      {/* 
        ✅ ИСПРАВЛЕНО: Hero теперь получает CTA из frontmatter.
        Если в .md нет 'cta', он получит undefined, что Hero должен уметь обрабатывать.
      */}
      <Hero
        title={data.title}
        description={data.description}
        cta={data.cta}
      />

      {data.coverImage ? (
        <section className="mx-auto max-w-5xl px-4 pb-2 pt-8 sm:px-6">
          <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="relative aspect-[1055/1491] w-full">
              <Image
                src={data.coverImage}
                alt={data.title}
                fill
                sizes="(min-width: 1024px) 960px, calc(100vw - 32px)"
                className="object-cover"
                priority={params.slug === 'kak-my-rabotaem'}
              />
            </div>
          </figure>
        </section>
      ) : null}

      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Основной контент страницы, который уже работал */}
        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: data.contentHtml }}
        />

        {/* 
          ✅ ДОБАВЛЕНО: Универсальный CtaBlock рендерится внизу, если есть 'cta' в frontmatter.
          Это и есть завершение стандарта E3.
        */}
        {data.cta && (
          <div className="mt-16 border-t pt-16">
            <CtaBlock 
            title={data.cta.label}
            description={data.cta.description}
            buttonText={data.cta.buttonText}
            href={data.cta.href}
            badge={data.cta.badge}
            />

          </div>
        )}
      </main>
    </>
  );
}
