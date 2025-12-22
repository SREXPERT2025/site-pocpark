import Image from 'next/image';
import Link from 'next/link';
import { clsx } from 'clsx';

type ProductCardProps = {
  href: string;
  title: string;
  description?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  priceFrom?: number;
  currency?: string;
};

function formatPriceFrom(priceFrom?: number, currency?: string) {
  const value = typeof priceFrom === 'number' ? priceFrom : undefined;
  if (value == null || Number.isNaN(value) || value <= 0) return 'Цена по запросу';

  const cur = currency || 'RUB';
  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: cur,
    maximumFractionDigits: 0,
  });

  return `От ${formatter.format(value)}`;
}

export default function ProductCard({
  href,
  title,
  description,
  coverImage,
  category,
  tags,
  priceFrom,
  currency,
}: ProductCardProps) {
  const tagList = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <Link
      href={href}
      className={clsx(
        'group block overflow-hidden rounded-2xl border border-border-primary bg-bg-primary shadow-sm transition hover:shadow-md'
      )}
    >
      <div className="relative h-44 w-full bg-bg-secondary">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-text-secondary">
            Нет фото
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          {category ? (
            <span className="inline-flex items-center rounded-full border border-border-primary px-3 py-1 text-xs text-text-secondary">
              {category}
            </span>
          ) : null}

          {tagList.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full border border-border-primary px-3 py-1 text-xs text-text-secondary"
            >
              #{t}
            </span>
          ))}

          <span className="ml-auto text-xs font-medium text-accent-primary">
            {formatPriceFrom(priceFrom, currency)}
          </span>
        </div>

        <div className="mt-3 text-lg font-semibold text-text-primary group-hover:text-text-primary">
          {title}
        </div>

        {description ? (
          <p className="mt-2 line-clamp-3 text-sm text-text-secondary">{description}</p>
        ) : null}

        <div className="mt-4 text-sm font-medium text-accent-primary">Подробнее →</div>
      </div>
    </Link>
  );
}
