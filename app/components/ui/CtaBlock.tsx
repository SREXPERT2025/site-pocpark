import Link from "next/link";

interface CtaBlockProps {
  title: string;
  description?: string;
  buttonText: string;
  href: string;
  badge?: string;
}

export default function CtaBlock({
  title,
  description,
  buttonText,
  href,
  badge,
}: CtaBlockProps) {
  return (
    <section className="my-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          {badge && (
            <div className="mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              {badge}
            </div>
          )}
          <h3 className="text-xl font-semibold text-slate-900">
            {title}
          </h3>
          {description && (
            <p className="mt-2 text-slate-600">
              {description}
            </p>
          )}
        </div>

        <Link
          href={href}
          className="inline-flex h-fit items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
