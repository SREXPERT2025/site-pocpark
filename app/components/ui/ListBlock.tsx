export default function ListBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (!items?.length) return null;

  return (
    <section className="mt-section">
      <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">{title}</h2>
      <div className="mt-6 rounded-md border border-border-primary bg-bg-secondary p-6">
        <ul className="space-y-2 text-sm text-text-secondary">
          {items.map((it, idx) => (
            <li key={`${title}-${idx}`} className="flex gap-3">
              <span className="mt-1 text-green-600">✓</span>
              <span className="text-text-primary">{it}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
