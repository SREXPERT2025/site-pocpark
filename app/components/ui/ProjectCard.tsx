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
  const formatLabel =
    format === 'video' ? 'Видео' : format === 'text' ? 'Текст' : undefined;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition hover:shadow-soft-lg"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-secondary">
            Нет изображения
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {formatLabel && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
              {formatLabel}
            </span>
          )}
          {chips.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-text-secondary"
            >
              #{t}
            </span>
          ))}
        </div>

        <h3 className="mt-3 text-base font-semibold text-text-primary">
          {title}
        </h3>
        <p className="mt-2 text-sm text-text-secondary line-clamp-3">
          {description}
        </p>

        <div className="mt-4 text-sm font-semibold text-brand group-hover:underline">
          Подробнее
        </div>
      </div>
    </Link>
  );
}
