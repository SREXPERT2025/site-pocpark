import Link from 'next/link';

export type DownloadItem = {
  title: string;
  url: string;
};

export default function DownloadsBlock({
  title = 'Документы',
  items,
}: {
  title?: string;
  items: DownloadItem[];
}) {
  if (!items?.length) return null;

  return (
    <section className="mt-section">
      <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">{title}</h2>
      <div className="mt-6 rounded-md border border-border-primary bg-bg-secondary p-6">
        <ul className="space-y-3 text-sm">
          {items
            .filter((d) => d && d.title?.trim() && d.url?.trim())
            .map((d, idx) => (
              <li key={`${d.title}-${idx}`}>
                <Link
                  href={d.url}
                  className="inline-flex items-center gap-2 text-text-primary underline decoration-border-primary underline-offset-4 hover:opacity-80"
                >
                  <span aria-hidden="true">↓</span>
                  <span>{d.title}</span>
                </Link>
                <div className="mt-1 text-xs text-text-secondary">{d.url}</div>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
