import Link from 'next/link';
import { clsx } from 'clsx';

export type LinkGridItem = {
  title: string;
  description?: string;
  href: string;
};

type LinkGridProps = {
  title: string;
  items: LinkGridItem[];
  className?: string;
};

export default function LinkGrid({ title, items, className }: LinkGridProps) {
  return (
    <section className={clsx('mt-section', className)}>
      <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">{title}</h2>
      <div className="mt-6 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'group rounded-md border border-border-primary bg-bg-primary p-6 transition',
              'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2'
            )}
          >
            <div className="text-lg font-semibold text-text-primary group-hover:text-text-primary">
              {item.title}
            </div>
            {item.description ? (
              <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
            ) : null}
            <div className="mt-4 text-sm font-medium text-accent-primary">Подробнее →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
