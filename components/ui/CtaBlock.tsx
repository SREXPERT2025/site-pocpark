import Link from "next/link";

export interface CtaBlockProps {
  title: string;
  description: string;
  buttonText: string;
  href: string;
  badge?: string;
}

export function CtaBlock({
  title,
  description,
  buttonText,
  href,
  badge,
}: CtaBlockProps) {
  return (
    <section className="my-12 rounded-2xl border bg-slate-50 p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          {badge && (
            <span className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              {badge}
            </span>
          )}
          <h3 className="text-xl font-semibold text-slate-900">
            {title}
          </h3>
          <p className="mt-2 max-w-xl text-slate-600">
            {description}
          </p>
        </div>

        <Link
          href={href}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
