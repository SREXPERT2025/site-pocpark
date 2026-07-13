import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

type CompactInfographicItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
};

type CompactInfographicProps = {
  id: string;
  title: string;
  items: readonly CompactInfographicItem[];
};

export default function CompactInfographic({
  id,
  title,
  items,
}: CompactInfographicProps) {
  return (
    <section className="py-8 md:py-10" aria-labelledby={`${id}-title`}>
      <h2
        id={`${id}-title`}
        className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl"
      >
        {title}
      </h2>

      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map(({ title: itemTitle, href, icon: Icon }, index) => {
          const content = (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Icon aria-hidden="true" className="h-7 w-7" strokeWidth={1.8} />
              </span>
              <span className="mt-5 text-xl font-bold text-slate-950">{itemTitle}</span>
            </>
          );

          return (
            <li key={itemTitle} className="relative">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -left-4 top-1/2 hidden h-px w-4 bg-slate-300 md:block"
                />
              )}
              {href ? (
                <Link
                  href={href}
                  className="group flex min-h-[160px] flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex min-h-[160px] flex-col rounded-xl border border-slate-200 bg-white p-5">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
