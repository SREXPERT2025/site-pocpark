export type Specification = { name: string; value: string };

export default function TableBlock({ specifications }: { specifications: Specification[] }) {
  if (!specifications?.length) return null;

  return (
    <section className="mt-section">
      <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">Технические характеристики</h2>
      <div className="mt-6 rounded-md border border-border-primary bg-bg-secondary p-6">
        <div className="divide-y divide-border-primary">
          {specifications.map((spec) => (
            <div key={spec.name} className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-2">
              <div className="text-sm text-text-secondary">{spec.name}</div>
              <div className="text-sm font-medium font-mono text-text-primary">{spec.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
