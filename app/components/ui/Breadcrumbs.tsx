import Link from 'next/link';

export type Breadcrumb = { label: string; href?: string };

export default function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  if (!items?.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-text-primary">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-text-primary' : ''}>{item.label}</span>
              )}
              {!isLast ? <span aria-hidden="true">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
