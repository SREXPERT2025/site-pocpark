import Link from 'next/link';

export type ProjectCardProps = {
  title: string;
  description: string;
  href: string;
  coverImage?: string;
  format?: string;
  tags?: string[];
};

export default function ProjectCard({
  title,
  description,
  href,
  coverImage,
  format,
  tags,
}: ProjectCardProps) {
  const chips = (tags ?? []).slice(0, 3);
  const extraCount = Math.max(0, (tags?.length ?? 0) - chips.length);
  const formatLabel =
    format === 'video' ? 'Видео' : format === 'text' ? 'Текст' : undefined;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-border-primary bg-bg-primary shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-border-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-primary"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-bg-secondary">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-secondary">
            Нет изображения
          </div>
        )}

        {/* Мягкий оверлей на hover — делает карточку «дороже» и увеличивает контраст текста ниже */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {formatLabel && (
            <span className="rounded-full bg-text-primary px-2.5 py-1 text-[11px] font-semibold text-bg-primary">
              {formatLabel}
            </span>
          )}
          {chips.map((t) => (
            <span
              key={t}
              className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition-colors group-hover:bg-border-secondary"
            >
              #{t}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
              +{extraCount}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-semibold text-text-primary [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
          {title}
        </h3>
        <p className="mt-2 text-sm text-text-secondary [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">
          {description}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-primary">
          <span className="group-hover:underline">Подробнее</span>
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
  );
}
