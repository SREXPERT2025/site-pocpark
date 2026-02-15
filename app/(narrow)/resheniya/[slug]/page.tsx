import { notFound } from 'next/navigation';
import { getContentBySlug, getAllContentMeta } from '@/lib/content-parser'; // Предполагаем, что парсер здесь

// UI Компоненты
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
      {/* 
        ✅ ИСПРАВЛЕНО: Hero теперь получает CTA из frontmatter.
        Если в .md нет 'cta', он получит undefined, что Hero должен уметь обрабатывать.
      */}
      <Hero
        title={data.title}
        description={data.description}
        cta={data.cta}
      />

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
