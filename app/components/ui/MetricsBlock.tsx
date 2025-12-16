export type MetricItem = { label: string; value: string };

export default function MetricsBlock({ items }: { items: MetricItem[] }) {
  if (!items?.length) return null;

  return (
    <section className="mt-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <div
            key={m.label}
            className="rounded-md border border-border-primary bg-bg-secondary p-5"
          >
            <div className="text-xs uppercase tracking-wide text-text-secondary">{m.label}</div>
            <div className="mt-2 text-lg font-semibold text-text-primary">{m.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
